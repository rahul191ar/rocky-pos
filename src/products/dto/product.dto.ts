import { IsNotEmpty, IsOptional, IsString, IsNumber, IsBoolean, Min, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BarcodeParamDto {
  @ApiProperty({
    description: 'Product barcode',
    example: '1234567890123'
  })
  @IsNotEmpty()
  @IsString()
  code: string;
}

export class CreateProductDto {
  @ApiProperty({
    description: 'Product name',
    example: 'iPhone 14 Pro'
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Product description',
    example: 'Latest iPhone model with advanced camera system'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Stock Keeping Unit (SKU) - unique identifier',
    example: 'IPH14-PRO-128-BLK'
  })
  @IsNotEmpty()
  @IsString()
  sku: string;

  @ApiPropertyOptional({
    description: 'Product barcode',
    example: '1234567890123'
  })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({
    description: 'Selling price',
    example: 999.99,
    minimum: 0
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    description: 'Cost price (wholesale/purchase price)',
    example: 799.99,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({
    description: 'Initial stock quantity',
    example: 50,
    minimum: 0,
    default: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number = 0;

  @ApiPropertyOptional({
    description: 'Minimum stock threshold for alerts',
    example: 5,
    minimum: 0,
    default: 5
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minQuantity?: number = 5;

  @ApiProperty({
    description: 'Category ID',
    example: 'cuid-category-123',
    format: 'uuid'
  })
  @IsNotEmpty()
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({
    description: 'Supplier ID',
    example: 'cuid-supplier-123',
    format: 'uuid'
  })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({
    description: 'Product active status',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateProductDto {
  @ApiPropertyOptional({
    description: 'Product name',
    example: 'iPhone 14 Pro Max'
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Product description',
    example: 'Updated product description'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Stock Keeping Unit (SKU)',
    example: 'IPH14-PRO-256-BLK'
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({
    description: 'Product barcode',
    example: '1234567890124'
  })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({
    description: 'Selling price',
    example: 1099.99,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    description: 'Cost price',
    example: 899.99,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({
    description: 'Stock quantity',
    example: 75,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Minimum stock threshold',
    example: 10,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minQuantity?: number;

  @ApiPropertyOptional({
    description: 'Category ID',
    example: 'cuid-category-456',
    format: 'uuid'
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Supplier ID',
    example: 'cuid-supplier-456',
    format: 'uuid'
  })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({
    description: 'Product active status',
    example: false
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ProductResponseDto {
  @ApiProperty({ description: 'Product ID', example: 'cuid-product-123' })
  id: string;

  @ApiProperty({ description: 'Product name', example: 'iPhone 14 Pro' })
  name: string;

  @ApiProperty({ description: 'Product description', example: 'Latest iPhone model', nullable: true })
  description: string | null;

  @ApiProperty({ description: 'Product SKU', example: 'IPH14-PRO-128-BLK' })
  sku: string;

  @ApiProperty({ description: 'Product barcode', example: '1234567890123', nullable: true })
  barcode: string | null;

  @ApiProperty({ description: 'Selling price', example: 999.99 })
  price: number;

  @ApiProperty({ description: 'Cost price', example: 799.99, nullable: true })
  costPrice: number | null;

  @ApiProperty({ description: 'Current stock quantity', example: 50 })
  quantity: number;

  @ApiProperty({ description: 'Minimum stock threshold', example: 5 })
  minQuantity: number;

  @ApiProperty({ description: 'Category ID', example: 'cuid-category-123' })
  categoryId: string;

  @ApiProperty({ description: 'Supplier ID', example: 'cuid-supplier-123', nullable: true })
  supplierId: string | null;

  @ApiProperty({ description: 'Product active status', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Creation date', example: '2023-10-16T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date', example: '2023-10-16T10:30:00.000Z' })
  updatedAt: Date;

  // Relations
  @ApiPropertyOptional({
    description: 'Product category information',
    type: 'object',
    properties: {
      id: { type: 'string', example: 'cuid-category-123' },
      name: { type: 'string', example: 'Electronics' }
    }
  })
  category?: {
    id: string;
    name: string;
  };

  @ApiPropertyOptional({
    description: 'Product supplier information',
    type: 'object',
    properties: {
      id: { type: 'string', example: 'cuid-supplier-123' },
      name: { type: 'string', example: 'Apple Inc.' }
    }
  })
  supplier?: {
    id: string;
    name: string;
  };
}
