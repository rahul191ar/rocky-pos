import { IsNotEmpty, IsOptional, IsString, IsNumber, IsEnum, IsUUID, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod, SaleStatus } from '@prisma/client';

export class CreateSaleItemDto {
  @IsNotEmpty()
  @IsUUID()
  productId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number = 0;
}

export class CreateSaleDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number = 0;

  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSaleDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SaleResponseDto {
  id: string;
  customerId: string | null;
  userId: string;
  totalAmount: number;
  discount: number;
  taxAmount: number;
  finalAmount: number;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  items?: SaleItemResponseDto[];
}

export class SaleItemResponseDto {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;

  // Relations
  product?: {
    id: string;
    name: string;
    sku: string;
  };
}
