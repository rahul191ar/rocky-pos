import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto, ProductResponseDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto): Promise<ProductResponseDto> {
    const { categoryId, supplierId, ...productData } = createProductDto;

    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new BadRequestException(`Category with ID ${categoryId} not found`);
    }

    // Verify supplier exists if provided
    if (supplierId) {
      const supplier = await this.prisma.supplier.findUnique({
        where: { id: supplierId },
      });

      if (!supplier) {
        throw new BadRequestException(`Supplier with ID ${supplierId} not found`);
      }
    }

    // Check if SKU already exists
    const existingProduct = await this.prisma.product.findUnique({
      where: { sku: createProductDto.sku },
    });

    if (existingProduct) {
      throw new BadRequestException('Product with this SKU already exists');
    }

    const product = await this.prisma.product.create({
      data: {
        ...productData,
        categoryId,
        supplierId,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
        supplier: {
          select: { id: true, name: true },
        },
      },
    });

    return this.mapToResponseDto(product);
  }

  async findAll(): Promise<ProductResponseDto[]> {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: {
          select: { id: true, name: true },
        },
        supplier: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return products.map(product => this.mapToResponseDto(product));
  }

  async findOne(id: string): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true },
        },
        supplier: {
          select: { id: true, name: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return this.mapToResponseDto(product);
  }

  async findBySku(sku: string): Promise<ProductResponseDto | null> {
    const product = await this.prisma.product.findUnique({
      where: { sku },
      include: {
        category: {
          select: { id: true, name: true },
        },
        supplier: {
          select: { id: true, name: true },
        },
      },
    });

    return product ? this.mapToResponseDto(product) : null;
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Check if SKU is being updated and if it already exists
    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingProduct = await this.prisma.product.findUnique({
        where: { sku: updateProductDto.sku },
      });

      if (existingProduct) {
        throw new BadRequestException('Product with this SKU already exists');
      }
    }

    // Verify category exists if being updated
    if (updateProductDto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: updateProductDto.categoryId },
      });

      if (!category) {
        throw new BadRequestException(`Category with ID ${updateProductDto.categoryId} not found`);
      }
    }

    // Verify supplier exists if being updated
    if (updateProductDto.supplierId) {
      const supplier = await this.prisma.supplier.findUnique({
        where: { id: updateProductDto.supplierId },
      });

      if (!supplier) {
        throw new BadRequestException(`Supplier with ID ${updateProductDto.supplierId} not found`);
      }
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: updateProductDto,
      include: {
        category: {
          select: { id: true, name: true },
        },
        supplier: {
          select: { id: true, name: true },
        },
      },
    });

    return this.mapToResponseDto(updatedProduct);
  }

  async remove(id: string): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const deletedProduct = await this.prisma.product.delete({
      where: { id },
    });

    return this.mapToResponseDto(deletedProduct);
  }

  async toggleProductStatus(id: string): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: { isActive: !product.isActive },
      include: {
        category: {
          select: { id: true, name: true },
        },
        supplier: {
          select: { id: true, name: true },
        },
      },
    });

    return this.mapToResponseDto(updatedProduct);
  }

  async updateStock(id: string, quantity: number): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const newQuantity = product.quantity + quantity;

    if (newQuantity < 0) {
      throw new BadRequestException('Insufficient stock');
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: { quantity: newQuantity },
      include: {
        category: {
          select: { id: true, name: true },
        },
        supplier: {
          select: { id: true, name: true },
        },
      },
    });

    return this.mapToResponseDto(updatedProduct);
  }

  async getLowStockProducts(): Promise<ProductResponseDto[]> {
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        quantity: {
          lte: this.prisma.product.fields.minQuantity,
        },
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
        supplier: {
          select: { id: true, name: true },
        },
      },
      orderBy: { quantity: 'asc' },
    });

    return products.map(product => this.mapToResponseDto(product));
  }

  private mapToResponseDto(product: any): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      sku: product.sku,
      barcode: product.barcode,
      price: product.price,
      costPrice: product.costPrice,
      quantity: product.quantity,
      minQuantity: product.minQuantity,
      categoryId: product.categoryId,
      supplierId: product.supplierId,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      category: product.category,
      supplier: product.supplier,
    };
  }
}
