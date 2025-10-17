import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from '../../src/dashboard/dashboard.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TestDatabase } from '../test-database';
import { SaleStatus, PaymentMethod } from '@prisma/client';

describe('DashboardService', () => {
  let service: DashboardService;
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
        DashboardService,
        {
          provide: PrismaService,
          useValue: TestDatabase.getPrisma(),
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
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

  describe('getDashboardSummary', () => {
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

    it('should return complete dashboard summary with all sections', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          sku: 'TEST-001',
          price: 100.00,
          quantity: 5, // Low stock
          minQuantity: 10,
          categoryId: category.id,
        },
      });

      // Create today's sale
      await prisma.sale.create({
        data: {
          customerId: customer.id,
          userId: user.id,
          totalAmount: 100.00,
          discount: 5.00,
          taxAmount: 10.00,
          finalAmount: 105.00,
          paymentMethod: PaymentMethod.CASH,
          status: SaleStatus.COMPLETED,
          items: {
            create: [
              {
                productId: product.id,
                quantity: 2,
                unitPrice: 50.00,
                totalPrice: 100.00,
              },
            ],
          },
        },
      });

      const result = await service.getDashboardSummary();

      expect(result).toBeDefined();
      expect(result.todaySales).toBeDefined();
      expect(result.todaySales.totalSales).toBe(1);
      expect(result.todaySales.totalRevenue).toBe(105.00);
      expect(result.todaySales.totalDiscount).toBe(5.00);
      expect(result.todaySales.totalTax).toBe(10.00);
      expect(result.todaySales.totalItemsSold).toBe(2);

      expect(result.topSellingProducts).toBeDefined();
      expect(Array.isArray(result.topSellingProducts)).toBe(true);

      expect(result.lowStockProducts).toBeDefined();
      expect(result.lowStockProducts).toHaveLength(1);
      expect(result.lowStockProducts[0].name).toBe('Test Product');
      expect(result.lowStockProducts[0].currentStock).toBe(5);

      expect(result.customersAddedToday).toBe(1);
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it('should return empty results when no data exists', async () => {
      const result = await service.getDashboardSummary();

      expect(result.todaySales.totalSales).toBe(0);
      expect(result.todaySales.totalRevenue).toBe(0);
      expect(result.todaySales.totalDiscount).toBe(0);
      expect(result.todaySales.totalTax).toBe(0);
      expect(result.todaySales.averageSaleValue).toBe(0);
      expect(result.todaySales.totalItemsSold).toBe(0);

      expect(result.topSellingProducts).toEqual([]);
      expect(result.lowStockProducts).toEqual([]);
      
      // Customer was created in beforeEach, so expect 1
      expect(result.customersAddedToday).toBe(1);
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it('should only include today\'s sales in todaySales', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          sku: 'TEST-001',
          price: 100.00,
          categoryId: category.id,
        },
      });

      // Create sale from yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await prisma.sale.create({
        data: {
          userId: user.id,
          totalAmount: 100.00,
          finalAmount: 100.00,
          paymentMethod: PaymentMethod.CASH,
          status: SaleStatus.COMPLETED,
          createdAt: yesterday,
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

      // Create sale from today
      await prisma.sale.create({
        data: {
          userId: user.id,
          totalAmount: 50.00,
          finalAmount: 50.00,
          paymentMethod: PaymentMethod.CASH,
          status: SaleStatus.COMPLETED,
          items: {
            create: [
              {
                productId: product.id,
                quantity: 1,
                unitPrice: 50.00,
                totalPrice: 50.00,
              },
            ],
          },
        },
      });

      const result = await service.getDashboardSummary();

      expect(result.todaySales.totalSales).toBe(1);
      expect(result.todaySales.totalRevenue).toBe(50.00);
    });

    it('should only include completed sales in todaySales', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          sku: 'TEST-001',
          price: 100.00,
          categoryId: category.id,
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

      // Create completed sale
      await prisma.sale.create({
        data: {
          userId: user.id,
          totalAmount: 50.00,
          finalAmount: 50.00,
          paymentMethod: PaymentMethod.CASH,
          status: SaleStatus.COMPLETED,
          items: {
            create: [
              {
                productId: product.id,
                quantity: 1,
                unitPrice: 50.00,
                totalPrice: 50.00,
              },
            ],
          },
        },
      });

      const result = await service.getDashboardSummary();

      expect(result.todaySales.totalSales).toBe(1);
      expect(result.todaySales.totalRevenue).toBe(50.00);
    });

    it('should return top-selling products based on quantity sold', async () => {
      const product1 = await prisma.product.create({
        data: {
          name: 'Popular Product',
          sku: 'POP-001',
          price: 50.00,
          categoryId: category.id,
        },
      });

      const product2 = await prisma.product.create({
        data: {
          name: 'Less Popular Product',
          sku: 'LESS-001',
          price: 100.00,
          categoryId: category.id,
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
                quantity: 5,
                unitPrice: 30.00,
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

      const result = await service.getDashboardSummary();

      expect(result.topSellingProducts).toHaveLength(2);
      expect(result.topSellingProducts[0].name).toBe('Popular Product');
      expect(result.topSellingProducts[0].totalQuantitySold).toBe(5);
      expect(result.topSellingProducts[1].name).toBe('Less Popular Product');
      expect(result.topSellingProducts[1].totalQuantitySold).toBe(1);
    });

    it('should return low-stock products (less than 10)', async () => {
      const lowStockProduct = await prisma.product.create({
        data: {
          name: 'Low Stock Product',
          sku: 'LOW-001',
          price: 100.00,
          quantity: 3,
          minQuantity: 5,
          categoryId: category.id,
        },
      });

      const normalStockProduct = await prisma.product.create({
        data: {
          name: 'Normal Stock Product',
          sku: 'NORMAL-001',
          price: 100.00,
          quantity: 50,
          minQuantity: 10,
          categoryId: category.id,
        },
      });

      const result = await service.getDashboardSummary();

      expect(result.lowStockProducts).toHaveLength(1);
      expect(result.lowStockProducts[0].name).toBe('Low Stock Product');
      expect(result.lowStockProducts[0].currentStock).toBe(3);
      expect(result.lowStockProducts[0].minQuantity).toBe(5);
    });

    it('should not include inactive products in low-stock results', async () => {
      await prisma.product.create({
        data: {
          name: 'Inactive Low Stock Product',
          sku: 'INACTIVE-001',
          price: 100.00,
          quantity: 2,
          minQuantity: 5,
          isActive: false,
          categoryId: category.id,
        },
      });

      const result = await service.getDashboardSummary();

      expect(result.lowStockProducts).toHaveLength(0);
    });

    it('should only count customers added today', async () => {
      // Create customer from yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await prisma.customer.create({
        data: {
          firstName: 'Yesterday',
          lastName: 'Customer',
          email: 'yesterday@example.com',
          createdAt: yesterday,
        },
      });

      // Customer created today is already in beforeEach

      const result = await service.getDashboardSummary();

      expect(result.customersAddedToday).toBe(1);
    });

    it('should handle database errors gracefully', async () => {
      // Mock prisma to throw an error
      jest.spyOn(prisma.sale, 'aggregate').mockRejectedValueOnce(new Error('Database error'));

      await expect(service.getDashboardSummary()).rejects.toThrow('Database error');
    });

    it('should calculate average sale value correctly', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Test Product',
          sku: 'TEST-001',
          price: 100.00,
          categoryId: category.id,
        },
      });

      // Create multiple sales with different amounts
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
                productId: product.id,
                quantity: 2,
                unitPrice: 100.00,
                totalPrice: 200.00,
              },
            ],
          },
        },
      });

      const result = await service.getDashboardSummary();

      expect(result.todaySales.totalSales).toBe(2);
      expect(result.todaySales.totalRevenue).toBe(300.00);
      expect(result.todaySales.averageSaleValue).toBe(150.00);
    });

    it('should return top-selling products with category information', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Categorized Product',
          sku: 'CAT-001',
          price: 100.00,
          quantity: 20,
          categoryId: category.id,
        },
      });

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
                quantity: 3,
                unitPrice: 33.33,
                totalPrice: 100.00,
              },
            ],
          },
        },
      });

      const result = await service.getDashboardSummary();

      expect(result.topSellingProducts).toHaveLength(1);
      expect(result.topSellingProducts[0].categoryName).toBe('Electronics');
      expect(result.topSellingProducts[0].currentStock).toBe(20);
    });
  });

  describe('legacy getDashboardStats', () => {
    it('should maintain backward compatibility', async () => {
      const result = await service.getDashboardStats();
      
      expect(result).toBeDefined();
      expect(typeof result.totalSales).toBe('number');
      expect(typeof result.totalProducts).toBe('number');
      expect(typeof result.totalCustomers).toBe('number');
      expect(typeof result.totalRevenue).toBe('number');
      expect(typeof result.lowStockProducts).toBe('number');
    });
  });
});