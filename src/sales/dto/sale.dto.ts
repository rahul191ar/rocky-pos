import { IsNotEmpty, IsOptional, IsString, IsNumber, IsEnum, IsUUID, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, SaleStatus } from '@prisma/client';

export class CreateSaleItemDto {
  @ApiProperty({
    description: 'Product ID to be sold',
    example: 'product-id-123',
    format: 'uuid'
  })
  @IsNotEmpty()
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Quantity of the product to sell',
    example: 2,
    minimum: 1
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Discount amount for this item',
    example: 0,
    minimum: 0,
    default: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number = 0;
}

export class CreateSaleDto {
  @ApiPropertyOptional({
    description: 'Customer ID for this sale (optional for walk-in customers)',
    example: 'customer-id-123',
    format: 'uuid'
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty({
    description: 'Array of items to be sold in this transaction',
    type: [CreateSaleItemDto],
    example: [
      {
        productId: 'product-id-123',
        quantity: 2,
        discount: 0
      }
    ]
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];

  @ApiPropertyOptional({
    description: 'Total discount applied to the entire sale',
    example: 0,
    minimum: 0,
    default: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number = 0;

  @ApiPropertyOptional({
    description: 'Tax amount applied to the sale',
    example: 0,
    minimum: 0,
    default: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number = 0;

  @ApiProperty({
    description: 'Payment method used for this sale',
    enum: PaymentMethod,
    example: PaymentMethod.CASH,
    enumName: 'PaymentMethod'
  })
  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Additional notes or comments about the sale',
    example: 'Customer requested gift wrapping',
    maxLength: 500
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSaleDto {
  @ApiPropertyOptional({
    description: 'Customer ID to update',
    example: 'customer-id-123',
    format: 'uuid'
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Updated discount amount',
    example: 50,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({
    description: 'Updated tax amount',
    example: 100,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @ApiPropertyOptional({
    description: 'Updated payment method',
    enum: PaymentMethod,
    example: PaymentMethod.CARD,
    enumName: 'PaymentMethod'
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Updated sale status',
    enum: SaleStatus,
    example: SaleStatus.COMPLETED,
    enumName: 'SaleStatus'
  })
  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @ApiPropertyOptional({
    description: 'Updated notes',
    example: 'Payment completed via mobile app',
    maxLength: 500
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SaleItemResponseDto {
  @ApiProperty({ description: 'Sale item ID', example: 'item-id-123' })
  id: string;

  @ApiProperty({ description: 'Associated sale ID', example: 'sale-id-123' })
  saleId: string;

  @ApiProperty({ description: 'Product ID', example: 'product-id-123' })
  productId: string;

  @ApiProperty({ description: 'Quantity sold', example: 2 })
  quantity: number;

  @ApiProperty({ description: 'Unit price at time of sale', example: 999.99 })
  unitPrice: number;

  @ApiProperty({ description: 'Discount applied to this item', example: 0 })
  discount: number;

  @ApiProperty({ description: 'Total price for this item', example: 1999.98 })
  totalPrice: number;

  // Relations
  @ApiPropertyOptional({
    description: 'Product information',
    example: {
      id: 'product-id-123',
      name: 'iPhone 14',
      sku: 'IPH14-128-BLK'
    }
  })
  product?: {
    id: string;
    name: string;
    sku: string;
  };
}

export class SaleResponseDto {
  @ApiProperty({ description: 'Sale ID', example: 'sale-id-123' })
  id: string;

  @ApiProperty({ description: 'Customer ID', example: 'customer-id-123', nullable: true })
  customerId: string | null;

  @ApiProperty({ description: 'User ID who created the sale', example: 'user-id-123' })
  userId: string;

  @ApiProperty({ description: 'Total sale amount before discounts and tax', example: 1999.98 })
  totalAmount: number;

  @ApiProperty({ description: 'Total discount applied', example: 0 })
  discount: number;

  @ApiProperty({ description: 'Tax amount', example: 0 })
  taxAmount: number;

  @ApiProperty({ description: 'Final amount after discounts and tax', example: 1999.98 })
  finalAmount: number;

  @ApiProperty({ description: 'Payment method', enum: PaymentMethod, example: PaymentMethod.CASH })
  paymentMethod: PaymentMethod;

  @ApiProperty({ description: 'Sale status', enum: SaleStatus, example: SaleStatus.COMPLETED })
  status: SaleStatus;

  @ApiProperty({ description: 'Additional notes', example: 'Customer satisfied', nullable: true })
  notes: string | null;

  @ApiProperty({ description: 'Sale creation timestamp', example: '2023-10-16T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Sale last update timestamp', example: '2023-10-16T10:30:00.000Z' })
  updatedAt: Date;

  // Relations
  @ApiPropertyOptional({
    description: 'Customer information',
    example: {
      id: 'customer-id-123',
      firstName: 'John',
      lastName: 'Doe'
    }
  })
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
  };

  @ApiPropertyOptional({
    description: 'User who created the sale',
    example: {
      id: 'user-id-123',
      firstName: 'Jane',
      lastName: 'Smith'
    }
  })
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };

  @ApiPropertyOptional({
    description: 'Sale items',
    type: [SaleItemResponseDto]
  })
  items?: SaleItemResponseDto[];
}
