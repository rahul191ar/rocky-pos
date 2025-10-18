import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvoiceItemDto {
  @ApiProperty({
    description: 'Product ID',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsString()
  productId: string;

  @ApiProperty({
    description: 'Item description',
    example: 'Premium wireless headphones with noise cancellation'
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Quantity',
    example: 2,
    minimum: 1
  })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({
    description: 'Unit price',
    example: 299.99,
    minimum: 0
  })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({
    description: 'Discount amount',
    example: 50.00,
    default: 0,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({
    description: 'Tax amount',
    example: 18.00,
    default: 0,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;
}

export class CreateInvoiceDto {
  @ApiProperty({
    description: 'Customer ID',
    example: '550e8400-e29b-41d4-a716-446655440001'
  })
  @IsString()
  customerId: string;

  @ApiPropertyOptional({
    description: 'Sale ID (if linked to a sale)',
    example: '550e8400-e29b-41d4-a716-446655440002'
  })
  @IsOptional()
  @IsString()
  saleId?: string;

  @ApiProperty({
    description: 'Invoice items',
    type: [CreateInvoiceItemDto],
    example: [
      {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        description: 'Premium wireless headphones',
        quantity: 2,
        unitPrice: 299.99,
        discount: 50.00,
        taxAmount: 18.00
      }
    ]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];

  @ApiPropertyOptional({
    description: 'Total discount amount',
    example: 25.00,
    default: 0,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({
    description: 'Total tax amount',
    example: 36.00,
    default: 0,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @ApiProperty({
    description: 'Due date in ISO format',
    example: '2024-12-31T23:59:59.000Z'
  })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Payment due within 30 days. Thank you for your business!'
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
