import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto, UpdateSupplierDto, SupplierResponseDto } from './dto/supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async create(createSupplierDto: CreateSupplierDto): Promise<SupplierResponseDto> {
    const supplier = await this.prisma.supplier.create({
      data: createSupplierDto,
    });
    return this.mapToResponseDto(supplier);
  }

  async findAll(): Promise<SupplierResponseDto[]> {
    const suppliers = await this.prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return suppliers.map(supplier => this.mapToResponseDto(supplier));
  }

  async findOne(id: string): Promise<SupplierResponseDto> {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new Error(`Supplier with ID ${id} not found`);
    return this.mapToResponseDto(supplier);
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto): Promise<SupplierResponseDto> {
    const supplier = await this.prisma.supplier.update({
      where: { id },
      data: updateSupplierDto,
    });
    return this.mapToResponseDto(supplier);
  }

  async remove(id: string): Promise<SupplierResponseDto> {
    const supplier = await this.prisma.supplier.delete({ where: { id } });
    return this.mapToResponseDto(supplier);
  }

  private mapToResponseDto(supplier: any): SupplierResponseDto {
    return {
      id: supplier.id,
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      city: supplier.city,
      state: supplier.state,
      zipCode: supplier.zipCode,
      isActive: supplier.isActive,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    };
  }
}
