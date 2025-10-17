import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from '../../src/dashboard/dashboard.controller';
import { DashboardService } from '../../src/dashboard/dashboard.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { HttpException, HttpStatus } from '@nestjs/common';
import { TestDatabase } from '../test-database';
import { SaleStatus, PaymentMethod } from '@prisma/client';

describe('DashboardController', () => {
  let controller: DashboardController;
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
      controllers: [DashboardController],
      providers: [
        DashboardService,
        {
          provide: PrismaService,
          useValue: TestDatabase.getPrisma(),
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DashboardController>(DashboardController);
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
    expect(controller).toBeDefined();
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

    it('should return comprehensive dashboard summary', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Dashboard Test Product',
          sku: 'DASH-001',
          price: 150.00,
          quantity: 8, // Low stock
          minQuantity: 10,
          categoryId: category.id,
        },
      });

      // Create today's sale
      await prisma.sale.create({
        data: {
          customerId: customer.id,
          userId: user.id,
          totalAmount: 300.00,
          discount: 20.00,
          taxAmount: 30.00,
          finalAmount: 310.00,
          paymentMethod: PaymentMethod.CARD,
          status: SaleStatus.COMPLETED,
          items: {
            create: [
              {
                productId: product.id,
                quantity: 2,
                unitPrice: 150.00,
                totalPrice: 300.00,
              },
            ],
          },
        },
      });

      const result = await controller.getDashboardSummary();

      expect(result).toBeDefined();
      
      // Verify today's sales data
      expect(result.todaySales).toMatchObject({
        totalSales: 1,
        totalRevenue: 310.00,
        totalDiscount: 20.00,
        totalTax: 30.00,
        averageSaleValue: 310.00,
        totalItemsSold: 2,
      });

      // Verify top-selling products
      expect(result.topSellingProducts).toBeDefined();
      expect(Array.isArray(result.topSellingProducts)).toBe(true);

      // Verify low-stock products
      expect(result.lowStockProducts).toHaveLength(1);
      expect(result.lowStockProducts[0]).toMatchObject({
        name: 'Dashboard Test Product',
        sku: 'DASH-001',
        currentStock: 8,
        minQuantity: 10,
        price: 150.00,
        categoryName: 'Electronics',
      });

      // Verify customers added today
      expect(result.customersAddedToday).toBe(1);

      // Verify metadata
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it('should return empty dashboard when no data exists', async () => {
      const result = await controller.getDashboardSummary();

      expect(result.todaySales).toMatchObject({
        totalSales: 0,
        totalRevenue: 0,
        totalDiscount: 0,
        totalTax: 0,
        averageSaleValue: 0,
        totalItemsSold: 0,
      });

      expect(result.topSellingProducts).toHaveLength(0);
      expect(result.lowStockProducts).toHaveLength(0);
      expect(result.customersAddedToday).toBe(1); // Customer is created in beforeEach
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it('should handle multiple sales and calculate totals correctly', async () => {
      const product1 = await prisma.product.create({
        data: {
          name: 'Product 1',
          sku: 'PROD-001',
          price: 100.00,
          categoryId: category.id,
        },
      });

      const product2 = await prisma.product.create({
        data: {
          name: 'Product 2',
          sku: 'PROD-002',
          price: 200.00,
          categoryId: category.id,
        },
      });

      // Create multiple sales
      await prisma.sale.create({
        data: {
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
                productId: product1.id,
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
          totalAmount: 400.00,
          discount: 10.00,
          taxAmount: 20.00,
          finalAmount: 410.00,
          paymentMethod: PaymentMethod.CARD,
          status: SaleStatus.COMPLETED,
          items: {
            create: [
              {
                productId: product2.id,
                quantity: 2,
                unitPrice: 200.00,
                totalPrice: 400.00,
              },
            ],
          },
        },
      });

      const result = await controller.getDashboardSummary();

      expect(result.todaySales.totalSales).toBe(2);
      expect(result.todaySales.totalRevenue).toBe(515.00);
      expect(result.todaySales.totalDiscount).toBe(15.00);
      expect(result.todaySales.totalTax).toBe(30.00);
      expect(result.todaySales.totalItemsSold).toBe(3);
      expect(result.todaySales.averageSaleValue).toBe(257.50);
    });

    it('should return top-selling products correctly ordered', async () => {
      const popularProduct = await prisma.product.create({
        data: {
          name: 'Very Popular Product',
          sku: 'POPULAR-001',
          price: 50.00,
          categoryId: category.id,
        },
      });

      const lessPopularProduct = await prisma.product.create({
        data: {
          name: 'Less Popular Product',
          sku: 'LESS-001',
          price: 100.00,
          categoryId: category.id,
        },
      });

      // Create sales for popular product (more quantity)
      await prisma.sale.create({
        data: {
          userId: user.id,
          totalAmount: 250.00,
          finalAmount: 250.00,
          paymentMethod: PaymentMethod.CASH,
          status: SaleStatus.COMPLETED,
          items: {
            create: [
              {
                productId: popularProduct.id,
                quantity: 5,
                unitPrice: 50.00,
                totalPrice: 250.00,
              },
            ],
          },
        },
      });

      // Create sales for less popular product (less quantity)
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
                productId: lessPopularProduct.id,
                quantity: 2,
                unitPrice: 100.00,
                totalPrice: 200.00,
              },
            ],
          },
        },
      });

      const result = await controller.getDashboardSummary();

      expect(result.topSellingProducts).toHaveLength(2);
      expect(result.topSellingProducts[0].name).toBe('Very Popular Product');
      expect(result.topSellingProducts[0].totalQuantitySold).toBe(5);
      expect(result.topSellingProducts[1].name).toBe('Less Popular Product');
      expect(result.topSellingProducts[1].totalQuantitySold).toBe(2);
    });

    it('should return low-stock products sorted by quantity', async () => {
      const criticalStock = await prisma.product.create({
        data: {
          name: 'Critical Stock Product',
          sku: 'CRITICAL-001',
          price: 100.00,
          quantity: 1,
          minQuantity: 5,
          categoryId: category.id,
        },
      });

      const lowStock = await prisma.product.create({
        data: {
          name: 'Low Stock Product',
          sku: 'LOW-001',
          price: 150.00,
          quantity: 5,
          minQuantity: 10,
          categoryId: category.id,
        },
      });

      const result = await controller.getDashboardSummary();

      expect(result.lowStockProducts).toHaveLength(2);
      expect(result.lowStockProducts[0].name).toBe('Critical Stock Product');
      expect(result.lowStockProducts[0].currentStock).toBe(1);
      expect(result.lowStockProducts[1].name).toBe('Low Stock Product');
      expect(result.lowStockProducts[1].currentStock).toBe(5);
    });

    it('should handle service errors and throw HTTP exception', async () => {
      // Mock service to throw an error
      jest.spyOn(service, 'getDashboardSummary').mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(controller.getDashboardSummary()).rejects.toThrow(HttpException);
      await expect(controller.getDashboardSummary()).rejects.toThrow(
        'Failed to fetch dashboard summary'
      );
    });

    it('should preserve service error details in logs but return generic error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      jest.spyOn(service, 'getDashboardSummary').mockRejectedValueOnce(
        new Error('Specific database error')
      );

      try {
        await controller.getDashboardSummary();
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(error.getResponse()).toBe('Failed to fetch dashboard summary');
      }

      consoleErrorSpy.mockRestore();
    });

    it('should return complete response structure', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Structure Test Product',
          sku: 'STRUCT-001',
          price: 75.00,
          quantity: 3,
          minQuantity: 5,
          categoryId: category.id,
        },
      });

      await prisma.sale.create({
        data: {
          userId: user.id,
          totalAmount: 75.00,
          finalAmount: 75.00,
          paymentMethod: PaymentMethod.CASH,
          status: SaleStatus.COMPLETED,
          items: {
            create: [
              {
                productId: product.id,
                quantity: 1,
                unitPrice: 75.00,
                totalPrice: 75.00,
              },
            ],
          },
        },
      });

      const result = await controller.getDashboardSummary();

      // Verify complete structure
      expect(result).toMatchObject({
        todaySales: {
          totalSales: expect.any(Number),
          totalRevenue: expect.any(Number),
          totalDiscount: expect.any(Number),
          totalTax: expect.any(Number),
          averageSaleValue: expect.any(Number),
          totalItemsSold: expect.any(Number),
        },
        topSellingProducts: expect.any(Array),
        lowStockProducts: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            sku: expect.any(String),
            categoryName: expect.any(String),
            currentStock: expect.any(Number),
            minQuantity: expect.any(Number),
            price: expect.any(Number),
          }),
        ]),
        customersAddedToday: expect.any(Number),
        lastUpdated: expect.any(Date),
      });
    });

    it('should only count completed sales for today', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Status Test Product',
          sku: 'STATUS-001',
          price: 100.00,
          categoryId: category.id,
        },
      });

      // Create pending sale (should not be counted)
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

      // Create cancelled sale (should not be counted)
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

      // Create completed sale (should be counted)
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

      const result = await controller.getDashboardSummary();

      expect(result.todaySales.totalSales).toBe(1);
      expect(result.todaySales.totalRevenue).toBe(50.00);
    });
  });

  describe('getDashboardStats (legacy)', () => {
    it('should return legacy dashboard stats', async () => {
      const result = await controller.getDashboardStats();

      expect(result).toBeDefined();
      expect(typeof result.totalSales).toBe('number');
      expect(typeof result.totalProducts).toBe('number');
      expect(typeof result.totalCustomers).toBe('number');
      expect(typeof result.totalRevenue).toBe('number');
      expect(typeof result.lowStockProducts).toBe('number');
    });
  });

  describe('authentication', () => {
    it('should be protected by JWT guard', () => {
      const guards = Reflect.getMetadata('__guards__', DashboardController);
      expect(guards).toContain(JwtAuthGuard);
    });
  });
});