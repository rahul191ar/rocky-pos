import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto, CategoryResponseDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
    const { name, description, isActive = true } = createCategoryDto;

    // Check if category name already exists
    const existingCategory = await this.prisma.category.findUnique({
      where: { name },
    });

    if (existingCategory) {
      throw new BadRequestException('Category with this name already exists');
    }

    const category = await this.prisma.category.create({
      data: {
        name,
        description,
        isActive,
      },
    });

    return this.mapToResponseDto(category);
  }

  async findAll(): Promise<CategoryResponseDto[]> {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return categories.map(category => this.mapToResponseDto(category));
  }

  async findOne(id: string): Promise<CategoryResponseDto> {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return this.mapToResponseDto(category);
  }

  async findByName(name: string): Promise<CategoryResponseDto | null> {
    const category = await this.prisma.category.findUnique({
      where: { name },
    });

    return category ? this.mapToResponseDto(category) : null;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check if name is being updated and if it already exists
    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const existingCategory = await this.prisma.category.findUnique({
        where: { name: updateCategoryDto.name },
      });

      if (existingCategory) {
        throw new BadRequestException('Category with this name already exists');
      }
    }

    const updatedCategory = await this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });

    return this.mapToResponseDto(updatedCategory);
  }

  async remove(id: string): Promise<CategoryResponseDto> {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check if category has products
    const productCount = await this.prisma.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      throw new BadRequestException('Cannot delete category that has products. Please move or delete products first.');
    }

    const deletedCategory = await this.prisma.category.delete({
      where: { id },
    });

    return this.mapToResponseDto(deletedCategory);
  }

  async toggleCategoryStatus(id: string): Promise<CategoryResponseDto> {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    const updatedCategory = await this.prisma.category.update({
      where: { id },
      data: { isActive: !category.isActive },
    });

    return this.mapToResponseDto(updatedCategory);
  }

  private mapToResponseDto(category: any): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
