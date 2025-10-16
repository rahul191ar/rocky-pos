import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSalesReport() {
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
