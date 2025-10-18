import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus } from './update-invoice-status.dto';

export class InvoiceItemResponseDto {
  @ApiProperty({ description: 'Invoice item ID' })
  id: string;

  @ApiProperty({ description: 'Product ID' })
  productId: string;

  @ApiProperty({ description: 'Item description' })
  description: string;

  @ApiProperty({ description: 'Quantity' })
  quantity: number;

  @ApiProperty({ description: 'Unit price' })
  unitPrice: number;

  @ApiProperty({ description: 'Discount amount' })
  discount: number;

  @ApiProperty({ description: 'Tax amount' })
  taxAmount: number;

  @ApiProperty({ description: 'Total price for this item' })
  totalPrice: number;

  @ApiPropertyOptional({ description: 'Associated product details' })
  product?: {
    id: string;
    name: string;
    sku: string;
  };
}

export class InvoiceCustomerResponseDto {
  @ApiProperty({ description: 'Customer ID' })
  id: string;

  @ApiProperty({ description: 'Customer name' })
  name: string;

  @ApiProperty({ description: 'Customer email' })
  email: string;

  @ApiProperty({ description: 'Customer phone' })
  phone: string;
}

export class InvoiceResponseDto {
  @ApiProperty({ description: 'Invoice ID' })
  id: string;

  @ApiProperty({ description: 'Invoice number', example: 'INV-202412-0001' })
  invoiceNumber: string;

  @ApiProperty({ description: 'Customer ID' })
  customerId: string;

  @ApiProperty({ description: 'Subtotal amount before tax and discount' })
  subtotal: number;

  @ApiProperty({ description: 'Total discount amount' })
  discount: number;

  @ApiProperty({ description: 'Total tax amount' })
  taxAmount: number;

  @ApiProperty({ description: 'Final total amount' })
  totalAmount: number;

  @ApiProperty({ description: 'Invoice status', enum: InvoiceStatus })
  status: InvoiceStatus;

  @ApiProperty({ description: 'Invoice creation date' })
  invoiceDate: Date;

  @ApiProperty({ description: 'Due date for payment' })
  dueDate: Date;

  @ApiPropertyOptional({ description: 'Date when invoice was paid' })
  paidDate?: Date;

  @ApiPropertyOptional({ description: 'Additional notes' })
  notes?: string;

  @ApiPropertyOptional({ description: 'Associated sale ID' })
  saleId?: string;

  @ApiProperty({ description: 'User ID who created the invoice' })
  createdBy: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'Customer details', type: InvoiceCustomerResponseDto })
  customer: InvoiceCustomerResponseDto;

  @ApiProperty({ description: 'Invoice items', type: [InvoiceItemResponseDto] })
  items: InvoiceItemResponseDto[];

  @ApiPropertyOptional({ description: 'Associated sale details' })
  sale?: any;
}

export class InvoiceStatsResponseDto {
  @ApiProperty({ description: 'Total number of invoices' })
  totalInvoices: number;

  @ApiProperty({ description: 'Number of unpaid invoices' })
  unpaidInvoices: number;

  @ApiProperty({ description: 'Number of paid invoices' })
  paidInvoices: number;

  @ApiProperty({ description: 'Number of overdue invoices' })
  overdueInvoices: number;

  @ApiProperty({ description: 'Total amount of all invoices' })
  totalAmount: number;

  @ApiProperty({ description: 'Total amount of paid invoices' })
  paidAmount: number;

  @ApiProperty({ description: 'Total amount of unpaid invoices' })
  unpaidAmount: number;
}
