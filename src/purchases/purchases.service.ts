import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.purchase.findMany({
      include: { supplier: true, user: true, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.purchase.findUnique({
      where: { id },
      include: { supplier: true, user: true, items: { include: { product: true } } },
    });
  }

  async create(purchaseData: any, userId: string) {
    return this.prisma.purchase.create({
      data: { ...purchaseData, userId },
      include: { supplier: true, user: true, items: { include: { product: true } } },
    });
  }
}
