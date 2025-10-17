import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto, UpdateSaleDto, SaleResponseDto, SaleItemResponseDto } from './dto/sale.dto';
import { PaymentMethod, SaleStatus } from '@prisma/client';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async create(createSaleDto: CreateSaleDto, userId: string): Promise<SaleResponseDto> {
    const { customerId, items, discount = 0, taxAmount = 0, paymentMethod, notes } = createSaleDto;

    // Validate items array is not empty
    if (!items || items.length === 0) {
      throw new BadRequestException('Sale must have at least one item');
    }

    // Validate customer if provided
    if (customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw new BadRequestException(`Customer with ID ${customerId} not found`);
      }
    }

    // Validate and process items
    let totalAmount = 0;
    const saleItems = [];

    for (const item of items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new BadRequestException(`Product with ID ${item.productId} not found`);
      }

      if (!product.isActive) {
        throw new BadRequestException(`Product ${product.name} is not active`);
      }

      if (product.quantity < item.quantity) {
        throw new BadRequestException(`Insufficient stock for product ${product.name}`);
      }

      const unitPrice = product.price;
      const itemDiscount = item.discount || 0;
      const totalPrice = (unitPrice * item.quantity) - itemDiscount;

      saleItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        discount: itemDiscount,
        totalPrice,
      });

      totalAmount += totalPrice;

      // Update product quantity
      await this.prisma.product.update({
        where: { id: item.productId },
        data: {
          quantity: {
            decrement: item.quantity,
          },
        },
      });
    }

    // Calculate final amount
    const discountAmount = (totalAmount * discount) / 100;
    const finalAmount = totalAmount - discountAmount + taxAmount;

    // Create sale transaction
    const sale = await this.prisma.sale.create({
      data: {
        customerId,
        userId,
        totalAmount,
        discount,
        taxAmount,
        finalAmount,
        paymentMethod,
        status: SaleStatus.COMPLETED,
        notes,
        items: {
          create: saleItems,
        },
      },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
      },
    });

    return this.mapToResponseDto(sale);
  }

  async findAll(): Promise<SaleResponseDto[]> {
    const sales = await this.prisma.sale.findMany({
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sales.map(sale => this.mapToResponseDto(sale));
  }

  async findOne(id: string): Promise<SaleResponseDto> {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }

    return this.mapToResponseDto(sale);
  }

  async findByUser(userId: string): Promise<SaleResponseDto[]> {
    const sales = await this.prisma.sale.findMany({
      where: { userId },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sales.map(sale => this.mapToResponseDto(sale));
  }

  async update(id: string, updateSaleDto: UpdateSaleDto): Promise<SaleResponseDto> {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
    });

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }

    const updatedSale = await this.prisma.sale.update({
      where: { id },
      data: updateSaleDto,
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
      },
    });

    return this.mapToResponseDto(updatedSale);
  }

  async cancelSale(id: string): Promise<SaleResponseDto> {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }

    if (sale.status === SaleStatus.CANCELLED) {
      throw new BadRequestException('Sale is already cancelled');
    }

    // Restore product quantities
    for (const item of sale.items) {
      await this.prisma.product.update({
        where: { id: item.productId },
        data: {
          quantity: {
            increment: item.quantity,
          },
        },
      });
    }

    const cancelledSale = await this.prisma.sale.update({
      where: { id },
      data: { status: SaleStatus.CANCELLED },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
      },
    });

    return this.mapToResponseDto(cancelledSale);
  }

  async getSalesReport(startDate?: Date, endDate?: Date): Promise<any> {
    const whereClause: any = {};

    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const sales = await this.prisma.sale.findMany({
      where: {
        ...whereClause,
        status: SaleStatus.COMPLETED,
      },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, price: true },
            },
          },
        },
      },
    });

    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.finalAmount, 0);
    const totalDiscount = sales.reduce((sum, sale) => sum + sale.discount, 0);
    const totalTax = sales.reduce((sum, sale) => sum + sale.taxAmount, 0);

    // Group by payment method
    const paymentMethodStats: { [key: string]: number } = {};
    sales.forEach(sale => {
      paymentMethodStats[sale.paymentMethod] = (paymentMethodStats[sale.paymentMethod] || 0) + 1;
    });

    return {
      totalSales,
      totalRevenue,
      totalDiscount,
      totalTax,
      averageSaleValue: totalSales > 0 ? totalRevenue / totalSales : 0,
      paymentMethodStats,
      sales,
    };
  }

  async getSalesByCustomer(customerId: string): Promise<SaleResponseDto[]> {
    const sales = await this.prisma.sale.findMany({
      where: { customerId },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sales.map(sale => this.mapToResponseDto(sale));
  }

  async getSalesByDateRange(startDate: Date, endDate: Date): Promise<SaleResponseDto[]> {
    if (startDate > endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    const sales = await this.prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sales.map(sale => this.mapToResponseDto(sale));
  }

  async updateSaleStatus(id: string, status: string): Promise<SaleResponseDto> {
    // Validate status
    if (!Object.values(SaleStatus).includes(status as SaleStatus)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    const sale = await this.prisma.sale.findUnique({
      where: { id },
    });

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }

    const updatedSale = await this.prisma.sale.update({
      where: { id },
      data: { status: status as SaleStatus },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
      },
    });

    return this.mapToResponseDto(updatedSale);
  }

  async getTotalSalesAmount(startDate: Date, endDate: Date): Promise<number> {
    const sales = await this.prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: SaleStatus.COMPLETED,
      },
      select: {
        finalAmount: true,
      },
    });

    return sales.reduce((sum, sale) => sum + sale.finalAmount, 0);
  }

  async getSalesCount(startDate: Date, endDate: Date): Promise<number> {
    return await this.prisma.sale.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: SaleStatus.COMPLETED,
      },
    });
  }

  async remove(id: string): Promise<SaleResponseDto> {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }

    // Use transaction to delete sale and restore product quantities
    const result = await this.prisma.$transaction(async (prisma) => {
      // Restore product quantities if sale was completed
      if (sale.status === SaleStatus.COMPLETED) {
        for (const item of sale.items) {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              quantity: {
                increment: item.quantity,
              },
            },
          });
        }
      }

      // Delete the sale (items will be cascade deleted)
      const deletedSale = await prisma.sale.delete({
        where: { id },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true },
          },
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true },
              },
            },
          },
        },
      });

      return deletedSale;
    });

    return this.mapToResponseDto(result);
  }

  private mapToResponseDto(sale: any): SaleResponseDto {
    return {
      id: sale.id,
      customerId: sale.customerId,
      userId: sale.userId,
      totalAmount: sale.totalAmount,
      discount: sale.discount,
      taxAmount: sale.taxAmount,
      finalAmount: sale.finalAmount,
      paymentMethod: sale.paymentMethod,
      status: sale.status,
      notes: sale.notes,
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
      customer: sale.customer,
      user: sale.user,
      items: sale.items?.map((item: any) => this.mapItemToResponseDto(item)),
    };
  }

  private mapItemToResponseDto(item: any): SaleItemResponseDto {
    return {
      id: item.id,
      saleId: item.saleId,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      totalPrice: item.totalPrice,
      product: item.product,
    };
  }
}
