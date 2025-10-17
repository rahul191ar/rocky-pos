import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, SaleStatus } from '@prisma/client';
import {
  SalesReportQueryDto,
  ExpenseReportQueryDto,
  SalesReportResponseDto,
  ExpenseReportResponseDto,
  TopSellingProductDto,
  SalesSummaryByDateDto,
  CategorySalesDto,
  PaymentMethodStatsDto,
  ExpenseSummaryByDateDto,
  ExpenseCategoryDto,
} from './dto/reports.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSalesReport(query?: SalesReportQueryDto): Promise<SalesReportResponseDto | any[]> {
    // Backward compatibility: if called with undefined (not empty object), return legacy format
    if (query === undefined) {
      return this.getSalesReportLegacy();
    }
    
    const { startDate, endDate, category } = query;
    
    // Validate dates if provided
    if (startDate && isNaN(new Date(startDate).getTime())) {
      throw new BadRequestException('Invalid start date format');
    }
    
    if (endDate && isNaN(new Date(endDate).getTime())) {
      throw new BadRequestException('Invalid end date format');
    }
    
    // Validate category ID if provided (support both UUID and CUID formats)
    if (category) {
      // Check if it's a valid format (UUID or CUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const cuidRegex = /^c[a-z0-9]{24}$/i;
      
      if (!uuidRegex.test(category) && !cuidRegex.test(category)) {
        throw new BadRequestException('Invalid category ID format');
      }
      
      // Check if category exists
      const categoryExists = await this.prisma.category.findUnique({
        where: { id: category },
      });
      
      if (!categoryExists) {
        throw new BadRequestException(`Category with ID ${category} not found`);
      }
    }
    
    // Default date range: last 30 days if not provided
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    const start = startDate ? new Date(startDate) : defaultStartDate;
    const end = endDate ? new Date(endDate) : defaultEndDate;
    
    // Ensure end date includes the full day
    end.setHours(23, 59, 59, 999);

    const whereClause: any = {
      status: SaleStatus.COMPLETED,
      createdAt: {
        gte: start,
        lte: end,
      },
    };

    // Add category filter if provided
    if (category) {
      whereClause.items = {
        some: {
          product: {
            categoryId: category,
          },
        },
      };
    }

    // Get overall summary
    const salesSummary = await this.prisma.sale.aggregate({
      where: whereClause,
      _count: { id: true },
      _sum: {
        finalAmount: true,
        discount: true,
        taxAmount: true,
        totalAmount: true,
      },
      _avg: {
        finalAmount: true,
      },
    });

    // Get total items sold
    const totalItemsResult = await this.prisma.saleItem.aggregate({
      where: {
        sale: whereClause,
      },
      _sum: {
        quantity: true,
      },
    });

    // Get daily sales summary
    const dailySales = await this.getDailySalesSummary(start, end, category);

    // Get top selling products
    const topSellingProducts = await this.getTopSellingProducts(start, end, category);

    // Get category breakdown
    const categoryBreakdown = await this.getCategorySalesBreakdown(start, end, category);

    // Get payment method statistics
    const paymentMethodStats = await this.getPaymentMethodStats(start, end, category);

    return {
      summary: {
        totalSales: salesSummary._count.id || 0,
        totalRevenue: salesSummary._sum.finalAmount || 0,
        totalDiscount: salesSummary._sum.discount || 0,
        totalTax: salesSummary._sum.taxAmount || 0,
        averageSaleValue: salesSummary._avg.finalAmount || 0,
        totalItems: totalItemsResult._sum.quantity || 0,
      },
      dailySummary: dailySales,
      topSellingProducts,
      categoryBreakdown,
      paymentMethodStats,
      dateRange: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      },
    };
  }

  private async getDailySalesSummary(
    startDate: Date,
    endDate: Date,
    category?: string,
  ): Promise<SalesSummaryByDateDto[]> {
    // Use raw query for daily grouping
    const dailySales = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT 
        DATE(s."createdAt") as date,
        COUNT(s.id)::integer as total_sales,
        COALESCE(SUM(s."finalAmount"), 0)::float as total_revenue,
        COALESCE(SUM(s.discount), 0)::float as total_discount,
        COALESCE(SUM(s."taxAmount"), 0)::float as total_tax,
        COALESCE(AVG(s."finalAmount"), 0)::float as average_sale_value
      FROM sales s
      ${category ? Prisma.sql`
        INNER JOIN sale_items si ON s.id = si."saleId"
        INNER JOIN products p ON si."productId" = p.id
      ` : Prisma.empty}
      WHERE s.status = 'COMPLETED'
        AND s."createdAt" >= ${startDate}
        AND s."createdAt" <= ${endDate}
        ${category ? Prisma.sql`AND p."categoryId" = ${category}` : Prisma.empty}
      GROUP BY DATE(s."createdAt")
      ORDER BY DATE(s."createdAt")
    `);

    return dailySales.map((day: any) => ({
      date: day.date.toISOString().split('T')[0],
      totalSales: day.total_sales,
      totalRevenue: day.total_revenue,
      totalDiscount: day.total_discount,
      totalTax: day.total_tax,
      averageSaleValue: day.average_sale_value,
    }));
  }

  private async getTopSellingProducts(
    startDate: Date,
    endDate: Date,
    category?: string,
    limit: number = 10,
  ): Promise<TopSellingProductDto[]> {
    const whereClause: any = {
      sale: {
        status: SaleStatus.COMPLETED,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    };

    if (category) {
      whereClause.product = {
        categoryId: category,
      };
    }

    const topProducts = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: whereClause,
      _sum: {
        quantity: true,
        totalPrice: true,
      },
      _count: {
        id: true,
      },
      _avg: {
        unitPrice: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: limit,
    });

    // Get product details
    const productIds = topProducts.map(item => item.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
      include: {
        category: {
          select: { name: true },
        },
      },
    });

    return topProducts.map(item => {
      const product = products.find(p => p.id === item.productId);
      return {
        id: item.productId,
        name: product?.name || 'Unknown Product',
        sku: product?.sku || 'N/A',
        categoryName: product?.category?.name || 'Unknown Category',
        totalQuantitySold: item._sum.quantity || 0,
        totalRevenue: item._sum.totalPrice || 0,
        averagePrice: item._avg.unitPrice || 0,
      };
    });
  }

  private async getCategorySalesBreakdown(
    startDate: Date,
    endDate: Date,
    category?: string,
  ): Promise<CategorySalesDto[]> {
    // Use raw query for category breakdown
    const categoryStats = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT 
        c.id as category_id,
        c.name as category_name,
        COUNT(DISTINCT s.id)::integer as total_sales,
        COALESCE(SUM(si."totalPrice"), 0)::float as total_revenue,
        COALESCE(SUM(si.quantity), 0)::integer as total_quantity_sold,
        COALESCE(AVG(si."unitPrice"), 0)::float as average_price
      FROM categories c
      INNER JOIN products p ON c.id = p."categoryId"
      INNER JOIN sale_items si ON p.id = si."productId"
      INNER JOIN sales s ON si."saleId" = s.id
      WHERE s.status = 'COMPLETED'
        AND s."createdAt" >= ${startDate}
        AND s."createdAt" <= ${endDate}
        ${category ? Prisma.sql`AND c.id = ${category}` : Prisma.empty}
      GROUP BY c.id, c.name
      ORDER BY total_revenue DESC
    `);

    return categoryStats.map((cat: any) => ({
      categoryId: cat.category_id,
      categoryName: cat.category_name,
      totalSales: cat.total_sales,
      totalRevenue: cat.total_revenue,
      totalQuantitySold: cat.total_quantity_sold,
      averagePrice: cat.average_price,
    }));
  }

  private async getPaymentMethodStats(
    startDate: Date,
    endDate: Date,
    category?: string,
  ): Promise<PaymentMethodStatsDto[]> {
    const whereClause: any = {
      status: SaleStatus.COMPLETED,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (category) {
      whereClause.items = {
        some: {
          product: {
            categoryId: category,
          },
        },
      };
    }

    const paymentStats = await this.prisma.sale.groupBy({
      by: ['paymentMethod'],
      where: whereClause,
      _count: {
        id: true,
      },
      _sum: {
        finalAmount: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    const totalSales = paymentStats.reduce((sum, stat) => sum + stat._count.id, 0);

    return paymentStats.map(stat => ({
      paymentMethod: stat.paymentMethod,
      count: stat._count.id,
      totalAmount: stat._sum.finalAmount || 0,
      percentage: totalSales > 0 ? (stat._count.id / totalSales) * 100 : 0,
    }));
  }

  async getExpenseReport(query: ExpenseReportQueryDto): Promise<ExpenseReportResponseDto> {
    const { startDate, endDate, category } = query;
    
    // Validate dates if provided
    if (startDate && isNaN(new Date(startDate).getTime())) {
      throw new BadRequestException('Invalid start date format');
    }
    
    if (endDate && isNaN(new Date(endDate).getTime())) {
      throw new BadRequestException('Invalid end date format');
    }
    
    // Default date range: last 30 days if not provided
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    const start = startDate ? new Date(startDate) : defaultStartDate;
    const end = endDate ? new Date(endDate) : defaultEndDate;
    
    // Ensure end date includes the full day
    end.setHours(23, 59, 59, 999);

    const whereClause: any = {
      date: {
        gte: start,
        lte: end,
      },
    };

    if (category) {
      whereClause.category = category;
    }

    // Get overall summary
    const expenseSummary = await this.prisma.expense.aggregate({
      where: whereClause,
      _count: { id: true },
      _sum: {
        amount: true,
      },
      _avg: {
        amount: true,
      },
    });

    // Get daily expense summary
    const dailyExpenses = await this.getDailyExpenseSummary(start, end, category);

    // Get category breakdown
    const categoryBreakdown = await this.getExpenseCategoryBreakdown(start, end, category);

    return {
      summary: {
        totalExpenses: expenseSummary._sum.amount || 0,
        expenseCount: expenseSummary._count.id || 0,
        averageExpenseAmount: expenseSummary._avg.amount || 0,
      },
      dailySummary: dailyExpenses,
      categoryBreakdown,
      dateRange: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      },
    };
  }

  private async getDailyExpenseSummary(
    startDate: Date,
    endDate: Date,
    category?: string,
  ): Promise<ExpenseSummaryByDateDto[]> {
    const whereClause: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (category) {
      whereClause.category = category;
    }

    // Use raw query for daily grouping
    const dailyExpenses = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT 
        DATE(e.date) as date,
        COALESCE(SUM(e.amount), 0)::float as total_expenses,
        COUNT(e.id)::integer as expense_count
      FROM expenses e
      WHERE e.date >= ${startDate}
        AND e.date <= ${endDate}
        ${category ? Prisma.sql`AND e.category = ${category}` : Prisma.empty}
      GROUP BY DATE(e.date)
      ORDER BY DATE(e.date)
    `);

    return dailyExpenses.map((day: any) => ({
      date: day.date.toISOString().split('T')[0],
      totalExpenses: day.total_expenses,
      expenseCount: day.expense_count,
    }));
  }

  private async getExpenseCategoryBreakdown(
    startDate: Date,
    endDate: Date,
    category?: string,
  ): Promise<ExpenseCategoryDto[]> {
    const whereClause: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (category) {
      whereClause.category = category;
    }

    const categoryStats = await this.prisma.expense.groupBy({
      by: ['category'],
      where: whereClause,
      _count: {
        id: true,
      },
      _sum: {
        amount: true,
      },
      _avg: {
        amount: true,
      },
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
    });

    const totalExpenses = categoryStats.reduce((sum, stat) => sum + (stat._sum.amount || 0), 0);

    return categoryStats.map(stat => ({
      category: stat.category,
      totalAmount: stat._sum.amount || 0,
      expenseCount: stat._count.id,
      percentage: totalExpenses > 0 ? ((stat._sum.amount || 0) / totalExpenses) * 100 : 0,
      averageAmount: stat._avg.amount || 0,
    }));
  }

  // Legacy methods for backward compatibility
  async getSalesReportLegacy() {
    return this.prisma.sale.findMany({
      include: { items: { include: { product: true } } },
    });
  }

  async getInventoryReport() {
    return this.prisma.product.findMany({
      include: { category: true, supplier: true },
    });
  }
}
