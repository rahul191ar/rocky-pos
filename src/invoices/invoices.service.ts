import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceStatusDto, InvoiceStatus } from './dto/update-invoice-status.dto';
import { ListInvoicesDto } from './dto/list-invoices.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async createInvoice(createInvoiceDto: CreateInvoiceDto, userId: string): Promise<InvoiceResponseDto> {
    const { customerId, saleId, items, discount = 0, taxAmount = 0, dueDate, notes } = createInvoiceDto;

    // Verify customer exists
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    // Calculate totals
    let subtotal = 0;
    let totalDiscount = discount;
    let totalTax = taxAmount;

    for (const item of items) {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemDiscount = item.discount || 0;
      const itemTax = item.taxAmount || 0;
      
      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;
      totalTax += itemTax;
    }

    const totalAmount = subtotal - totalDiscount + totalTax;

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    // Create invoice with items
    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId,
        saleId,
        subtotal,
        discount: totalDiscount,
        taxAmount: totalTax,
        totalAmount,
        finalAmount: totalAmount, // For now, finalAmount = totalAmount
        status: InvoiceStatus.UNPAID,
        dueDate: new Date(dueDate),
        notes,
        userId,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            taxAmount: item.taxAmount || 0,
            totalPrice: (item.quantity * item.unitPrice) - (item.discount || 0) + (item.taxAmount || 0),
          })),
        },
      },
      include: {
        items: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        user: {
          select: {
            id: true,
          },
        },
      },
    });

    // Transform to match InvoiceResponseDto
    const response: InvoiceResponseDto = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      status: invoice.status as InvoiceStatus,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      paidDate: invoice.paidDate || undefined,
      notes: invoice.notes || undefined,
      saleId: invoice.saleId || undefined,
      createdBy: invoice.userId,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      customer: {
        id: invoice.customer.id,
        name: `${invoice.customer.firstName} ${invoice.customer.lastName}`,
        email: invoice.customer.email || '',
        phone: invoice.customer.phone || '',
      },
      items: invoice.items.map(item => ({
        id: item.id,
        productId: item.productId || '',
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        taxAmount: item.taxAmount,
        totalPrice: item.totalPrice,
      })),
    };

    return response;
  }

  async listInvoices(filters: ListInvoicesDto): Promise<InvoiceResponseDto[]> {
    const { customerId, status, startDate, endDate } = filters;

    const where: any = {};

    if (customerId) {
      where.customerId = customerId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) {
        where.invoiceDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.invoiceDate.lte = new Date(endDate);
      }
    }

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        items: true,
        user: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        invoiceDate: 'desc',
      },
    });

    // Transform to match InvoiceResponseDto[]
    return invoices.map((invoice: any) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      status: invoice.status as InvoiceStatus,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      paidDate: invoice.paidDate || undefined,
      notes: invoice.notes || undefined,
      saleId: invoice.saleId || undefined,
      createdBy: invoice.userId,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      customer: {
        id: invoice.customer.id,
        name: `${invoice.customer.firstName} ${invoice.customer.lastName}`,
        email: invoice.customer.email || '',
        phone: invoice.customer.phone || '',
      },
      items: invoice.items.map((item: any) => ({
        id: item.id,
        productId: item.productId || '',
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        taxAmount: item.taxAmount,
        totalPrice: item.totalPrice,
      })),
    }));
  }

  async getInvoiceById(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
        sale: true,
        user: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    // Transform to match InvoiceResponseDto
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      status: invoice.status as InvoiceStatus,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      paidDate: invoice.paidDate || undefined,
      notes: invoice.notes || undefined,
      saleId: invoice.saleId || undefined,
      createdBy: invoice.userId,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      customer: {
        id: invoice.customer.id,
        name: `${invoice.customer.firstName} ${invoice.customer.lastName}`,
        email: invoice.customer.email || '',
        phone: invoice.customer.phone || '',
      },
      items: invoice.items.map((item: any) => ({
        id: item.id,
        productId: item.productId || '',
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        taxAmount: item.taxAmount,
        totalPrice: item.totalPrice,
        product: item.product ? {
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku,
        } : undefined,
      })),
      sale: invoice.sale || undefined,
    };
  }

  async getInvoiceByNumber(invoiceNumber: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { invoiceNumber },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
        sale: true,
        user: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with number ${invoiceNumber} not found`);
    }

    // Transform to match InvoiceResponseDto
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      status: invoice.status as InvoiceStatus,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      paidDate: invoice.paidDate || undefined,
      notes: invoice.notes || undefined,
      saleId: invoice.saleId || undefined,
      createdBy: invoice.userId,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      customer: {
        id: invoice.customer.id,
        name: `${invoice.customer.firstName} ${invoice.customer.lastName}`,
        email: invoice.customer.email || '',
        phone: invoice.customer.phone || '',
      },
      items: invoice.items.map((item: any) => ({
        id: item.id,
        productId: item.productId || '',
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        taxAmount: item.taxAmount,
        totalPrice: item.totalPrice,
        product: item.product ? {
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku,
        } : undefined,
      })),
      sale: invoice.sale || undefined,
    };
  }

  async updateInvoiceStatus(id: string, updateStatusDto: UpdateInvoiceStatusDto) {
    const { status, paidDate } = updateStatusDto;

    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('Cannot update status of a cancelled invoice');
    }

    const updateData: any = { status };

    if (status === InvoiceStatus.PAID && paidDate) {
      updateData.paidDate = new Date(paidDate);
    }

    const updatedInvoice = await this.prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        items: true,
        user: {
          select: {
            id: true,
          },
        },
      },
    });

    // Transform to match InvoiceResponseDto
    return {
      id: updatedInvoice.id,
      invoiceNumber: updatedInvoice.invoiceNumber,
      customerId: updatedInvoice.customerId,
      subtotal: updatedInvoice.subtotal,
      discount: updatedInvoice.discount,
      taxAmount: updatedInvoice.taxAmount,
      totalAmount: updatedInvoice.totalAmount,
      status: updatedInvoice.status,
      invoiceDate: updatedInvoice.invoiceDate,
      dueDate: updatedInvoice.dueDate,
      paidDate: updatedInvoice.paidDate || undefined,
      notes: updatedInvoice.notes || undefined,
      saleId: updatedInvoice.saleId || undefined,
      createdBy: updatedInvoice.userId,
      createdAt: updatedInvoice.createdAt,
      updatedAt: updatedInvoice.updatedAt,
      customer: {
        id: updatedInvoice.customer.id,
        name: `${updatedInvoice.customer.firstName} ${updatedInvoice.customer.lastName}`,
        email: updatedInvoice.customer.email || '',
        phone: updatedInvoice.customer.phone || '',
      },
      items: updatedInvoice.items.map((item: any) => ({
        id: item.id,
        productId: item.productId || '',
        discount: item.discount,
        taxAmount: item.taxAmount,
        totalPrice: item.totalPrice,
        product: item.product ? {
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku,
        } : undefined,
      })),
    };
  }

  async deleteInvoice(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Cannot cancel a paid invoice');
    }

    const cancelledInvoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.CANCELLED,
      },
    });

    return {
      message: 'Invoice cancelled successfully',
      invoice: cancelledInvoice,
    };
  }

  async getInvoiceStats() {
    const [totalInvoices, unpaidInvoices, paidInvoices, overdueInvoices, totalAmount, paidAmount] = await Promise.all([
      this.prisma.invoice.count(),
      this.prisma.invoice.count({ where: { status: InvoiceStatus.UNPAID } }),
      this.prisma.invoice.count({ where: { status: InvoiceStatus.PAID } }),
      this.prisma.invoice.count({ where: { status: InvoiceStatus.OVERDUE } }),
      this.prisma.invoice.aggregate({
        _sum: { totalAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: { status: InvoiceStatus.PAID },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      totalInvoices,
      unpaidInvoices,
      paidInvoices,
      overdueInvoices,
      totalAmount: totalAmount._sum.totalAmount || 0,
      paidAmount: paidAmount._sum.totalAmount || 0,
      unpaidAmount: (totalAmount._sum.totalAmount || 0) - (paidAmount._sum.totalAmount || 0),
    };
  }

  private async generateInvoiceNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');

    const prefix = `INV-${year}${month}`;

    const lastInvoice = await this.prisma.invoice.findFirst({
      where: {
        invoiceNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        invoiceNumber: 'desc',
      },
    });

    let sequence = 1;
    if (lastInvoice) {
      const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  }
}
