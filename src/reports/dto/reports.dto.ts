import { IsOptional, IsDateString, IsString, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

// Query DTOs
export class SalesReportQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  category?: string;
}

export class ExpenseReportQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  category?: string;
}

// Response DTOs
export class TopSellingProductDto {
  id: string;
  name: string;
  sku: string;
  categoryName: string;
  totalQuantitySold: number;
  totalRevenue: number;
  averagePrice: number;
}

export class SalesSummaryByDateDto {
  date: string;
  totalSales: number;
  totalRevenue: number;
  totalDiscount: number;
  totalTax: number;
  averageSaleValue: number;
}

export class CategorySalesDto {
  categoryId: string;
  categoryName: string;
  totalSales: number;
  totalRevenue: number;
  totalQuantitySold: number;
  averagePrice: number;
}

export class PaymentMethodStatsDto {
  paymentMethod: string;
  count: number;
  totalAmount: number;
  percentage: number;
}

export class SalesReportResponseDto {
  summary: {
    totalSales: number;
    totalRevenue: number;
    totalDiscount: number;
    totalTax: number;
    averageSaleValue: number;
    totalItems: number;
  };
  dailySummary: SalesSummaryByDateDto[];
  topSellingProducts: TopSellingProductDto[];
  categoryBreakdown: CategorySalesDto[];
  paymentMethodStats: PaymentMethodStatsDto[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export class ExpenseSummaryByDateDto {
  date: string;
  totalExpenses: number;
  expenseCount: number;
}

export class ExpenseCategoryDto {
  category: string;
  totalAmount: number;
  expenseCount: number;
  percentage: number;
  averageAmount: number;
}

export class ExpenseReportResponseDto {
  summary: {
    totalExpenses: number;
    expenseCount: number;
    averageExpenseAmount: number;
  };
  dailySummary: ExpenseSummaryByDateDto[];
  categoryBreakdown: ExpenseCategoryDto[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
}