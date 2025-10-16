import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from '../../src/reports/reports.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TestDatabase } from '../test-database';
import { SaleStatus, PaymentMethod } from '@prisma/client';

describe('ReportsService', () => {
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
      providers: [
        ReportsService,
        {
          provide: PrismaService,
          useValue: TestDatabase.getPrisma(),
        },
      ],
    }).compile();

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
    expect(service).toBeDefined();
  });

  describe('getSalesReport', () => {
    let category1: any, category2: any;
    let user: any;
    let customer: any;

    beforeEach(async () => {
      // Setup test data
      category1 = await prisma.category.create({
        data: { name: 'Electronics' },
      });

      category2 = await prisma.category.create({
        data: { name: 'Books' },
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

    it('should return comprehensive sales report with default date range', async () => {
      // Create products
      const product1 = await prisma.product.create({
        data: {
          name: 'iPhone 14',
          sku: 'IPH14',
          price: 999.99,
          categoryId: category1.id,
        },
      });

      const product2 = await prisma.product.create({
        data: {
          name: 'JavaScript Book',
          sku: 'JS-BOOK',
          price: 29.99,
          categoryId: category2.id,
        },
      });

      // Create sales
      const sale1 = await prisma.sale.create({
        data: {
          customerId: customer.id,
          userId: user.id,
          totalAmount: 999.99,
          discount: 0,
          taxAmount: 99.99,
          finalAmount: 1099.98,
          paymentMethod: PaymentMethod.CARD,
          status: SaleStatus.COMPLETED,
          items: {
            create: [
              {
                productId: product1.id,
                quantity: 1,
                unitPrice: 999.99,
                totalPrice: 999.99,
              },
            ],
          },
        },
      });

      const sale2 = await prisma.sale.create({
        data: {
          customerId: customer.id,
          userId: user.id,
          totalAmount: 59.98,
          discount: 5.00,
          taxAmount: 5.99,
          finalAmount: 60.97,
          paymentMethod: PaymentMethod.CASH,
          status: SaleStatus.COMPLETED,
          items: {
            create: [
              {
                productId: product2.id,
                quantity: 2,
                unitPrice: 29.99,
                totalPrice: 59.98,
              },
            ],
          },
        },
      });

      const result = await service.getSalesReport({});

      expect(result).toBeDefined();
      expect(result.summary.totalSales).toBe(2);
      expect(result.summary.totalRevenue).toBe(1160.95);
      expect(result.summary.totalDiscount).toBe(5.00);
      expect(result.summary.totalTax).toBe(105.98);
      expect(result.summary.totalItems).toBe(3);
      expect(result.dailySummary).toBeDefined();
      expect(result.topSellingProducts).toBeDefined();
      expect(result.categoryBreakdown).toBeDefined();
      expect(result.paymentMethodStats).toBeDefined();
      expect(result.dateRange).toBeDefined();
    });

    it('should filter sales by date range', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          sku: 'TEST-001',
          price: 100.00,
          categoryId: category1.id,
        },
      });

      // Create sale in the past
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 60);

      await prisma.sale.create({
        data: {
          userId: user.id,
          totalAmount: 100.00,
          finalAmount: 100.00,
          paymentMethod: PaymentMethod.CASH,
          status: SaleStatus.COMPLETED,
          createdAt: pastDate,
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

      // Create recent sale
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

      const result = await service.getSalesReport({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      expect(result.summary.totalSales).toBe(1);
      expect(result.summary.totalRevenue).toBe(100.00);
    });

    it('should filter sales by category', async () => {
      const product1 = await prisma.product.create({
        data: {
          name: 'Electronics Item',
          sku: 'ELEC-001',
          price: 200.00,
          categoryId: category1.id,
        },
      });

      const product2 = await prisma.product.create({
        data: {
          name: 'Book Item',
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

      const result = await service.getSalesReport({
        category: category1.id,
      });

      expect(result.summary.totalSales).toBe(1);
      expect(result.summary.totalRevenue).toBe(200.00);
    });

    it('should exclude cancelled and pending sales', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          sku: 'TEST-001',
          price: 100.00,
          categoryId: category1.id,
        },
      });

      // Create completed sale
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

      // Create cancelled sale
      await prisma.sale.create({
        data: {
          userId: user.id,
          totalAmount: 100.00,
          finalAmount: 100.00,
          paymentMethod: PaymentMethod.CASH,
          status: SaleStatus.CANCELLED,
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

      // Create pending sale
      await prisma.sale.create({
        data: {
          userId: user.id,
          totalAmount: 100.00,
          finalAmount: 100.00,
          paymentMethod: PaymentMethod.CASH,
          status: SaleStatus.PENDING,
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

      const result = await service.getSalesReport({});

      expect(result.summary.totalSales).toBe(1);
      expect(result.summary.totalRevenue).toBe(100.00);
    });

    it('should return top selling products correctly ordered', async () => {
      const product1 = await prisma.product.create({
        data: {
          name: 'Popular Product',
          sku: 'POP-001',
          price: 50.00,
          categoryId: category1.id,
        },
      });

      const product2 = await prisma.product.create({
        data: {
          name: 'Less Popular Product',
          sku: 'LESS-001',
          price: 100.00,
          categoryId: category1.id,
        },
      });

      // Create sales for popular product (higher quantity)
      await prisma.sale.create({
        data: {
          userId: user.id,
          totalAmount: 150.00,
          finalAmount: 150.00,
          paymentMethod: PaymentMethod.CASH,
          status: SaleStatus.COMPLETED,
          items: {
            create: [
              {
                productId: product1.id,
                quantity: 3,
                unitPrice: 50.00,
                totalPrice: 150.00,
              },
            ],
          },
        },
      });

      // Create sales for less popular product (lower quantity)
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
                productId: product2.id,
                quantity: 1,
                unitPrice: 100.00,
                totalPrice: 100.00,
              },
            ],
          },
        },
      });

      const result = await service.getSalesReport({});

      expect(result.topSellingProducts).toHaveLength(2);
      expect(result.topSellingProducts[0].name).toBe('Popular Product');
      expect(result.topSellingProducts[0].totalQuantitySold).toBe(3);
      expect(result.topSellingProducts[1].name).toBe('Less Popular Product');
      expect(result.topSellingProducts[1].totalQuantitySold).toBe(1);
    });

    it('should return payment method statistics with percentages', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          sku: 'TEST-001',
          price: 100.00,
          categoryId: category1.id,
        },
      });

      // Create 2 cash sales and 1 card sale
      for (let i = 0; i < 2; i++) {
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
      }

      await prisma.sale.create({
        data: {
          userId: user.id,
          totalAmount: 100.00,
          finalAmount: 100.00,
          paymentMethod: PaymentMethod.CARD,
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

      const result = await service.getSalesReport({});

      expect(result.paymentMethodStats).toHaveLength(2);
      
      const cashStats = result.paymentMethodStats.find(stat => stat.paymentMethod === 'CASH');
      const cardStats = result.paymentMethodStats.find(stat => stat.paymentMethod === 'CARD');
      
      expect(cashStats?.count).toBe(2);
      expect(cashStats?.percentage).toBeCloseTo(66.67, 1);
      expect(cardStats?.count).toBe(1);
      expect(cardStats?.percentage).toBeCloseTo(33.33, 1);
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

    it('should return comprehensive expense report with default date range', async () => {
      // Create expenses
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
          amount: 150.00,
        },
      });

      await prisma.expense.create({
        data: {
          userId: user.id,
          category: 'Office Supplies',
          description: 'Pens and pencils',
          amount: 15.75,
        },
      });

      const result = await service.getExpenseReport({});

      expect(result).toBeDefined();
      expect(result.summary.totalExpenses).toBe(191.25);
      expect(result.summary.expenseCount).toBe(3);
      expect(result.summary.averageExpenseAmount).toBeCloseTo(63.75, 2);
      expect(result.dailySummary).toBeDefined();
      expect(result.categoryBreakdown).toBeDefined();
      expect(result.dateRange).toBeDefined();
    });

    it('should filter expenses by date range', async () => {
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

      const result = await service.getExpenseReport({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      expect(result.summary.totalExpenses).toBe(50.00);
      expect(result.summary.expenseCount).toBe(1);
    });

    it('should filter expenses by category', async () => {
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

      const result = await service.getExpenseReport({
        category: 'Office Supplies',
      });

      expect(result.summary.totalExpenses).toBe(25.00);
      expect(result.summary.expenseCount).toBe(1);
    });

    it('should return category breakdown with percentages', async () => {
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
          category: 'Office Supplies',
          description: 'Pens',
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

      const result = await service.getExpenseReport({});

      expect(result.categoryBreakdown).toHaveLength(2);
      
      const officeSupplies = result.categoryBreakdown.find(cat => cat.category === 'Office Supplies');
      const marketing = result.categoryBreakdown.find(cat => cat.category === 'Marketing');
      
      expect(officeSupplies?.totalAmount).toBe(50.00);
      expect(officeSupplies?.expenseCount).toBe(2);
      expect(officeSupplies?.percentage).toBeCloseTo(33.33, 1);
      expect(officeSupplies?.averageAmount).toBe(25.00);
      
      expect(marketing?.totalAmount).toBe(100.00);
      expect(marketing?.expenseCount).toBe(1);
      expect(marketing?.percentage).toBeCloseTo(66.67, 1);
      expect(marketing?.averageAmount).toBe(100.00);
    });

    it('should handle empty results gracefully', async () => {
      const result = await service.getExpenseReport({});

      expect(result.summary.totalExpenses).toBe(0);
      expect(result.summary.expenseCount).toBe(0);
      expect(result.summary.averageExpenseAmount).toBe(0);
      expect(result.dailySummary).toHaveLength(0);
      expect(result.categoryBreakdown).toHaveLength(0);
    });
  });

  describe('legacy methods', () => {
    it('should maintain backward compatibility for getSalesReport', async () => {
      const result = await service.getSalesReport();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should maintain backward compatibility for getInventoryReport', async () => {
      const result = await service.getInventoryReport();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});