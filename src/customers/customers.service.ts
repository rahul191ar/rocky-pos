import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto, CustomerResponseDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(createCustomerDto: CreateCustomerDto): Promise<CustomerResponseDto> {
    const customer = await this.prisma.customer.create({
      data: createCustomerDto,
    });

    return this.mapToResponseDto(customer);
  }

  async findAll(): Promise<CustomerResponseDto[]> {
    const customers = await this.prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return customers.map(customer => this.mapToResponseDto(customer));
  }

  async findOne(id: string): Promise<CustomerResponseDto> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return this.mapToResponseDto(customer);
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto): Promise<CustomerResponseDto> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    const updatedCustomer = await this.prisma.customer.update({
      where: { id },
      data: updateCustomerDto,
    });

    return this.mapToResponseDto(updatedCustomer);
  }

  async remove(id: string): Promise<CustomerResponseDto> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    const deletedCustomer = await this.prisma.customer.delete({
      where: { id },
    });

    return this.mapToResponseDto(deletedCustomer);
  }

  async toggleCustomerStatus(id: string): Promise<CustomerResponseDto> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    const updatedCustomer = await this.prisma.customer.update({
      where: { id },
      data: { isActive: !customer.isActive },
    });

    return this.mapToResponseDto(updatedCustomer);
  }

  private mapToResponseDto(customer: any): CustomerResponseDto {
    return {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      zipCode: customer.zipCode,
      isActive: customer.isActive,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }
}
