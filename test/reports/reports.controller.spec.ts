import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from '../../src/reports/reports.controller';
import { ReportsService } from '../../src/reports/reports.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { TestDatabase } from '../test-database';
import { SaleStatus, PaymentMethod } from '@prisma/client';

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: ReportsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    await TestDatabase.setup();
  });

  afterAll(async () => {
    await TestDatabase.teardown();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        ReportsService,
        {
          provide: PrismaService,
          useValue: TestDatabase.getPrisma(),
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReportsController>(ReportsController);
    service = module.get<ReportsService>(ReportsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Clear database before each test
    await prisma.saleItem.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.purchaseItem.deleteMany();
    await prisma.purchase.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.user.deleteMany();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSalesReport', () => {
    let category: any;
    let user: any;
    let customer: any;

    beforeEach(async () => {
      // Setup test data
      category = await prisma.category.create({
        data: { name: 'Electronics' },
      });

      user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: 'hashedpassword',
          firstName: 'Test',
          lastName: 'User',
        },
      });

      customer = await prisma.customer.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
      });
    });

    it('should return sales report with no query parameters', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          sku: 'TEST-001',
          price: 100.00,
          categoryId: category.id,
        },
      });

      await prisma.sale.create({
        data: {
          customerId: customer.id,
          userId: user.id,
          totalAmount: 100.00,
          discount: 0,
          taxAmount: 10.00,
          finalAmount: 110.00,
          paymentMethod: PaymentMethod.CASH,
          status: SaleStatus.COMPLETED,
          items: {
            create: [
              {
                productId: product.id,
                quantity: 1,
                unitPrice: 100.00,
                totalPrice: 100.00,
              },
            ],
          },
        },
      });

      const result = await controller.getSalesReport({});

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.totalSales).toBe(1);
      expect(result.summary.totalRevenue).toBe(110.00);
      expect(result.summary.totalDiscount).toBe(0);
      expect(result.summary.totalTax).toBe(10.00);
      expect(result.summary.totalItems).toBe(1);
      expect(result.dailySummary).toBeDefined();
      expect(result.topSellingProducts).toBeDefined();
      expect(result.categoryBreakdown).toBeDefined();
      expect(result.paymentMethodStats).toBeDefined();
      expect(result.dateRange).toBeDefined();
    });

    it('should return sales report with date range filter', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          sku: 'TEST-001',
          price: 100.00,
          categoryId: category.id,
        },
      });

      // Create sale within date range
      await prisma.sale.create({
        data: {
          userId: user.id,
          totalAmount: 100.00,
          finalAmount: 100.00,
          paymentMethod: PaymentMethod.CASH,
          status: SaleStatus.COMPLETED,
          items: {
            create: [
              {
                productId: product.id,
                quantity: 1,
                unitPrice: 100.00,
                totalPrice: 100.00,
              },
            ],
          },
        },
      });

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const result = await controller.getSalesReport({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });

      expect(result.summary.totalSales).toBe(1);
      expect(result.dateRange.startDate).toBe(startDate.toISOString().split('T')[0]);
      expect(result.dateRange.endDate).toBe(endDate.toISOString().split('T')[0]);
    });

    it('should return sales report with category filter', async () => {
      const category2 = await prisma.category.create({
        data: { name: 'Books' },
      });

      const product1 = await prisma.product.create({
        data: {
          name: 'Electronics Product',
          sku: 'ELEC-001',
          price: 200.00,
          categoryId: category.id,
        },
      });

      const product2 = await prisma.product.create({
        data: {
          name: 'Book Product',
          sku: 'BOOK-001',
          price: 30.00,
          categoryId: category2.id,
        },
      });

      // Create sales in different categories
      await prisma.sale.create({
        data: {
          userId: user.id,
          totalAmount: 200.00,
          finalAmount: 200.00,
          paymentMethod: PaymentMethod.CASH,
          status: SaleStatus.COMPLETED,
          items: {
            create: [
              {
                productId: product1.id,
                quantity: 1,
                unitPrice: 200.00,
                totalPrice: 200.00,
              },
            ],
          },
        },
      });

      await prisma.sale.create({
        data: {
          userId: user.id,
          totalAmount: 30.00,
          finalAmount: 30.00,
          paymentMethod: PaymentMethod.CASH,
          status: SaleStatus.COMPLETED,
          items: {
            create: [
              {
                productId: product2.id,
                quantity: 1,
                unitPrice: 30.00,
                totalPrice: 30.00,
              },
            ],
          },
        },
      });

      const result = await controller.getSalesReport({
        category: category.id,
      });

      expect(result.summary.totalSales).toBe(1);
      expect(result.summary.totalRevenue).toBe(200.00);
    });

    it('should handle invalid date format gracefully', async () => {
      try {
        await controller.getSalesReport({
          startDate: 'invalid-date',
          endDate: '2023-12-31',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it('should handle invalid category UUID', async () => {
      try {
        await controller.getSalesReport({
          category: 'invalid-uuid',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it('should return empty report when no sales exist', async () => {
      const result = await controller.getSalesReport({});

      expect(result.summary.totalSales).toBe(0);
      expect(result.summary.totalRevenue).toBe(0);
      expect(result.dailySummary).toHaveLength(0);
      expect(result.topSellingProducts).toHaveLength(0);
      expect(result.categoryBreakdown).toHaveLength(0);
      expect(result.paymentMethodStats).toHaveLength(0);
    });

    it('should return complete sales report structure', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Complete Test Product',
          sku: 'COMPLETE-001',
          price: 150.00,
          categoryId: category.id,
        },
      });

      await prisma.sale.create({
        data: {
          customerId: customer.id,
          userId: user.id,
          totalAmount: 150.00,
          discount: 10.00,
          taxAmount: 15.00,
          finalAmount: 155.00,
          paymentMethod: PaymentMethod.CARD,
          status: SaleStatus.COMPLETED,
          items: {
            create: [
              {
                productId: product.id,
                quantity: 2,
                unitPrice: 75.00,
                totalPrice: 150.00,
              },
            ],
          },
        },
      });

      const result = await controller.getSalesReport({});

      // Verify all required fields are present
      expect(result.summary).toMatchObject({
        totalSales: expect.any(Number),
        totalRevenue: expect.any(Number),
        totalDiscount: expect.any(Number),
        totalTax: expect.any(Number),
        averageSaleValue: expect.any(Number),
        totalItems: expect.any(Number),
      });

      expect(result.dailySummary).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            date: expect.any(String),
            totalSales: expect.any(Number),
            totalRevenue: expect.any(Number),
            totalDiscount: expect.any(Number),
            totalTax: expect.any(Number),
            averageSaleValue: expect.any(Number),
          }),
        ])
      );

      expect(result.topSellingProducts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            sku: expect.any(String),
            categoryName: expect.any(String),
            totalQuantitySold: expect.any(Number),
            totalRevenue: expect.any(Number),
            averagePrice: expect.any(Number),
          }),
        ])
      );

      expect(result.categoryBreakdown).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            categoryId: expect.any(String),
            categoryName: expect.any(String),
            totalSales: expect.any(Number),
            totalRevenue: expect.any(Number),
            totalQuantitySold: expect.any(Number),
            averagePrice: expect.any(Number),
          }),
        ])
      );

      expect(result.paymentMethodStats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            paymentMethod: expect.any(String),
            count: expect.any(Number),
            totalAmount: expect.any(Number),
            percentage: expect.any(Number),
          }),
        ])
      );

      expect(result.dateRange).toMatchObject({
        startDate: expect.any(String),
        endDate: expect.any(String),
      });
    });
  });

  describe('getExpenseReport', () => {
    let user: any;

    beforeEach(async () => {
      user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: 'hashedpassword',
          firstName: 'Test',
          lastName: 'User',
        },
      });
    });

    it('should return expense report with no query parameters', async () => {
      await prisma.expense.create({
        data: {
          userId: user.id,
          category: 'Office Supplies',
          description: 'Printer paper',
          amount: 25.50,
        },
      });

      await prisma.expense.create({
        data: {
          userId: user.id,
          category: 'Marketing',
          description: 'Facebook ads',
          amount: 100.00,
        },
      });

      const result = await controller.getExpenseReport({});

      expect(result).toBeDefined();
      expect(result.summary.totalExpenses).toBe(125.50);
      expect(result.summary.expenseCount).toBe(2);
      expect(result.summary.averageExpenseAmount).toBe(62.75);
      expect(result.dailySummary).toBeDefined();
      expect(result.categoryBreakdown).toBeDefined();
      expect(result.dateRange).toBeDefined();
    });

    it('should return expense report with date range filter', async () => {
      // Create expense in the past
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 60);

      await prisma.expense.create({
        data: {
          userId: user.id,
          category: 'Office Supplies',
          description: 'Old expense',
          amount: 100.00,
          date: pastDate,
        },
      });

      // Create recent expense
      await prisma.expense.create({
        data: {
          userId: user.id,
          category: 'Office Supplies',
          description: 'Recent expense',
          amount: 50.00,
        },
      });

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const result = await controller.getExpenseReport({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });

      expect(result.summary.totalExpenses).toBe(50.00);
      expect(result.summary.expenseCount).toBe(1);
    });

    it('should return expense report with category filter', async () => {
      await prisma.expense.create({
        data: {
          userId: user.id,
          category: 'Office Supplies',
          description: 'Paper',
          amount: 25.00,
        },
      });

      await prisma.expense.create({
        data: {
          userId: user.id,
          category: 'Marketing',
          description: 'Ads',
          amount: 100.00,
        },
      });

      const result = await controller.getExpenseReport({
        category: 'Office Supplies',
      });

      expect(result.summary.totalExpenses).toBe(25.00);
      expect(result.summary.expenseCount).toBe(1);
    });

    it('should handle invalid date format gracefully', async () => {
      try {
        await controller.getExpenseReport({
          startDate: 'invalid-date',
          endDate: '2023-12-31',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it('should return empty report when no expenses exist', async () => {
      const result = await controller.getExpenseReport({});

      expect(result.summary.totalExpenses).toBe(0);
      expect(result.summary.expenseCount).toBe(0);
      expect(result.summary.averageExpenseAmount).toBe(0);
      expect(result.dailySummary).toHaveLength(0);
      expect(result.categoryBreakdown).toHaveLength(0);
    });

    it('should return complete expense report structure', async () => {
      await prisma.expense.create({
        data: {
          userId: user.id,
          category: 'Office Supplies',
          description: 'Complete test expense',
          amount: 75.00,
        },
      });

      const result = await controller.getExpenseReport({});

      // Verify all required fields are present
      expect(result.summary).toMatchObject({
        totalExpenses: expect.any(Number),
        expenseCount: expect.any(Number),
        averageExpenseAmount: expect.any(Number),
      });

      expect(result.dailySummary).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            date: expect.any(String),
            totalExpenses: expect.any(Number),
            expenseCount: expect.any(Number),
          }),
        ])
      );

      expect(result.categoryBreakdown).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            category: expect.any(String),
            totalAmount: expect.any(Number),
            expenseCount: expect.any(Number),
            percentage: expect.any(Number),
            averageAmount: expect.any(Number),
          }),
        ])
      );

      expect(result.dateRange).toMatchObject({
        startDate: expect.any(String),
        endDate: expect.any(String),
      });
    });
  });

  describe('legacy endpoints', () => {
    it('should handle legacy sales report endpoint', async () => {
      const result = await controller.getSalesReportLegacy();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle inventory report endpoint', async () => {
      const result = await controller.getInventoryReport();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('authentication', () => {
    it('should be protected by JWT guard', () => {
      const guards = Reflect.getMetadata('__guards__', ReportsController);
      expect(guards).toContain(JwtAuthGuard);
    });
  });
});