import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.expense.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(expenseData: any, userId: string) {
    return this.prisma.expense.create({
      data: { ...expenseData, userId },
      include: { user: true },
    });
  }
}
