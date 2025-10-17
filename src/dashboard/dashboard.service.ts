import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DashboardSummaryDto,
  TodaySalesDto,
  TopSellingProductDto,
  LowStockProductDto,
} from './dto/dashboard.dto';
import { SaleStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private prisma: PrismaService) {}

  async getDashboardSummary(): Promise<DashboardSummaryDto> {
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      // Execute all queries in parallel for better performance
      const [
        todaySales,
        topSellingProducts,
        lowStockProducts,
        customersAddedToday,
      ] = await Promise.all([
        this.getTodaySales(startOfToday, endOfToday),
        this.getTopSellingProducts(),
        this.getLowStockProducts(),
        this.getCustomersAddedToday(startOfToday, endOfToday),
      ]);

      return {
        todaySales,
        topSellingProducts,
        lowStockProducts,
        customersAddedToday,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error('Error fetching dashboard summary', error);
      throw error;
    }
  }

  private async getTodaySales(startOfToday: Date, endOfToday: Date): Promise<TodaySalesDto> {
    try {
      // Get today's sales summary
      const salesSummary = await this.prisma.sale.aggregate({
        where: {
          status: SaleStatus.COMPLETED,
          createdAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
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

      // Get total items sold today
      const totalItemsResult = await this.prisma.saleItem.aggregate({
        where: {
          sale: {
            status: SaleStatus.COMPLETED,
            createdAt: {
              gte: startOfToday,
              lte: endOfToday,
            },
          },
        },
        _sum: {
          quantity: true,
        },
      });

      return {
        totalSales: salesSummary._count.id || 0,
        totalRevenue: salesSummary._sum.finalAmount || 0,
        totalDiscount: salesSummary._sum.discount || 0,
        totalTax: salesSummary._sum.taxAmount || 0,
        averageSaleValue: salesSummary._avg.finalAmount || 0,
        totalItemsSold: totalItemsResult._sum.quantity || 0,
      };
    } catch (error) {
      this.logger.error('Error fetching today\'s sales', error);
      throw error;
    }
  }

  private async getTopSellingProducts(limit: number = 5): Promise<TopSellingProductDto[]> {
    try {
      // Get top-selling products based on quantity sold (last 30 days for better insights)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const topProducts = await this.prisma.saleItem.groupBy({
        by: ['productId'],
        where: {
          sale: {
            status: SaleStatus.COMPLETED,
            createdAt: {
              gte: thirtyDaysAgo,
            },
          },
        },
        _sum: {
          quantity: true,
          totalPrice: true,
        },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: limit,
      });

      if (topProducts.length === 0) {
        return [];
      }

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
          currentStock: product?.quantity || 0,
        };
      });
    } catch (error) {
      this.logger.error('Error fetching top-selling products', error);
      throw error;
    }
  }

  private async getLowStockProducts(threshold: number = 10): Promise<LowStockProductDto[]> {
    try {
      const lowStockProducts = await this.prisma.product.findMany({
        where: {
          isActive: true,
          quantity: {
            lt: threshold,
          },
        },
        include: {
          category: {
            select: { name: true },
          },
        },
        orderBy: {
          quantity: 'asc',
        },
        take: 20, // Limit to prevent too many results
      });

      return lowStockProducts.map(product => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        categoryName: product.category?.name || 'Unknown Category',
        currentStock: product.quantity,
        minQuantity: product.minQuantity,
        price: product.price,
      }));
    } catch (error) {
      this.logger.error('Error fetching low-stock products', error);
      throw error;
    }
  }

  private async getCustomersAddedToday(startOfToday: Date, endOfToday: Date): Promise<number> {
    try {
      const customersCount = await this.prisma.customer.count({
        where: {
          createdAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      });

      return customersCount;
    } catch (error) {
      this.logger.error('Error fetching customers added today', error);
      throw error;
    }
  }

  // Legacy method for backward compatibility
  async getDashboardStats() {
    try {
      const [totalSales, totalProducts, totalCustomers, totalRevenue, lowStockCount] = await Promise.all([
        this.prisma.sale.count({ where: { status: SaleStatus.COMPLETED } }),
        this.prisma.product.count({ where: { isActive: true } }),
        this.prisma.customer.count(),
        this.prisma.sale.aggregate({
          where: { status: SaleStatus.COMPLETED },
          _sum: { finalAmount: true },
        }),
        this.prisma.product.count({
          where: {
            isActive: true,
            quantity: { lt: 10 },
          },
        }),
      ]);

      return {
        totalSales,
        totalProducts,
        totalCustomers,
        totalRevenue: totalRevenue._sum.finalAmount || 0,
        lowStockProducts: lowStockCount,
      };
    } catch (error) {
      this.logger.error('Error fetching dashboard stats', error);
      throw error;
    }
  }
}