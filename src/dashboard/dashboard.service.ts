import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const [
      totalSales,
      totalProducts,
      totalCustomers,
      totalRevenue,
      lowStockProducts,
    ] = await Promise.all([
      this.prisma.sale.count(),
      this.prisma.product.count(),
      this.prisma.customer.count(),
      this.prisma.sale.aggregate({ _sum: { finalAmount: true } }),
      this.prisma.product.count({ where: { quantity: { lte: 5 } } }),
    ]);

    return {
      totalSales,
      totalProducts,
      totalCustomers,
      totalRevenue: totalRevenue._sum.finalAmount || 0,
      lowStockProducts,
    };
  }
}
