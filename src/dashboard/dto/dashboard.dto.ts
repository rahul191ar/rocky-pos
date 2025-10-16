export class TopSellingProductDto {
  id: string;
  name: string;
  sku: string;
  categoryName: string;
  totalQuantitySold: number;
  totalRevenue: number;
  currentStock: number;
}

export class LowStockProductDto {
  id: string;
  name: string;
  sku: string;
  categoryName: string;
  currentStock: number;
  minQuantity: number;
  price: number;
}

export class TodaySalesDto {
  totalSales: number;
  totalRevenue: number;
  totalDiscount: number;
  totalTax: number;
  averageSaleValue: number;
  totalItemsSold: number;
}

export class DashboardSummaryDto {
  todaySales: TodaySalesDto;
  topSellingProducts: TopSellingProductDto[];
  lowStockProducts: LowStockProductDto[];
  customersAddedToday: number;
  lastUpdated: Date;
}