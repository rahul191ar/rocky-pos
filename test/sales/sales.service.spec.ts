import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from '../../src/sales/sales.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TestDatabase } from '../test-database';
import { PaymentMethod, SaleStatus } from '@prisma/client';

describe('SalesService', () => {
  let service: SalesService;
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
        SalesService,
        {
          provide: PrismaService,
          useValue: TestDatabase.getPrisma(),
        },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
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

  describe('create', () => {
    it('should successfully create a sale with valid data', async () => {
      // Create test data
      const user = await prisma.user.create({
        data: {
          email: 'user@example.com',
          password: 'hashedpassword',
          firstName: 'Test',
          lastName: 'User',
        },
      });

      const category = await prisma.category.create({
        data: {
          name: 'Electronics',
        },
      });

      const product = await prisma.product.create({
        data: {
          name: 'iPhone 14',
          sku: 'IPH14-128',
          price: 999.99,
          quantity: 10,
          categoryId: category.id,
        },
      });

      const createSaleDto = {
        items: [
          {
            productId: product.id,
            quantity: 2,
            discount: 0,
          },
        ],
        paymentMethod: PaymentMethod.CASH,
        discount: 0,
        taxAmount: 50.00,
      };

      const result = await service.create(createSaleDto, user.id);

      expect(result).toBeDefined();
      expect(result.userId).toBe(user.id);
      expect(result.totalAmount).toBe(1999.98); // 999.99 * 2
      expect(result.finalAmount).toBe(2049.98); // 1999.98 + 50.00
      expect(result.paymentMethod).toBe(PaymentMethod.CASH);
      expect(result.status).toBe(SaleStatus.COMPLETED);
      expect(result.items).toHaveLength(1);

      // Verify product quantity was reduced
      const productInDb = await prisma.product.findUnique({
        where: { id: product.id },
      });
      expect(productInDb?.quantity).toBe(8); // 10 - 2
    });

    it('should throw error if product does not exist', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'user@example.com',
          password: 'hashedpassword',
          firstName: 'Test',
          lastName: 'User',
        },
      });

      const createSaleDto = {
        items: [
          {
            productId: 'non-existent-product-id',
            quantity: 1,
          },
        ],
        paymentMethod: PaymentMethod.CASH,
      };

      await expect(service.create(createSaleDto, user.id)).rejects.toThrow(
        'Product with ID non-existent-product-id not found',
      );
    });

    it('should throw error if insufficient stock', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'user@example.com',
          password: 'hashedpassword',
          firstName: 'Test',
          lastName: 'User',
        },
      });

      const category = await prisma.category.create({
        data: {
          name: 'Electronics',
        },
      });

      const product = await prisma.product.create({
        data: {
          name: 'iPhone 14',
          sku: 'IPH14-128',
          price: 999.99,
          quantity: 1, // Only 1 in stock
          categoryId: category.id,
        },
      });

      const createSaleDto = {
        items: [
          {
            productId: product.id,
            quantity: 2, // Trying to buy 2
          },
        ],
        paymentMethod: PaymentMethod.CASH,
      };

      await expect(service.create(createSaleDto, user.id)).rejects.toThrow(
        'Insufficient stock for product iPhone 14',
      );
    });

    it('should handle multiple items in a sale', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'user@example.com',
          password: 'hashedpassword',
          firstName: 'Test',
          lastName: 'User',
        },
      });

      const category = await prisma.category.create({
        data: {
          name: 'Electronics',
        },
      });

      const product1 = await prisma.product.create({
        data: {
          name: 'iPhone 14',
          sku: 'IPH14-128',
          price: 999.99,
          quantity: 5,
          categoryId: category.id,
        },
      });

      const product2 = await prisma.product.create({
        data: {
          name: 'iPad Pro',
          sku: 'IPAD-256',
          price: 799.99,
          quantity: 3,
          categoryId: category.id,
        },
      });

      const createSaleDto = {
        items: [
          {
            productId: product1.id,
            quantity: 2,
            discount: 50.00,
          },
          {
            productId: product2.id,
            quantity: 1,
            discount: 0,
          },
        ],
        paymentMethod: PaymentMethod.CARD,
        discount: 0,
        taxAmount: 100.00,
      };

      const result = await service.create(createSaleDto, user.id);

      expect(result.totalAmount).toBe(2749.97); // (999.99 * 2 - 50) + 799.99
      expect(result.finalAmount).toBe(2849.97); // 2749.97 + 100
      expect(result.items).toHaveLength(2);

      // Verify product quantities were reduced
      const product1InDb = await prisma.product.findUnique({
        where: { id: product1.id },
      });
      const product2InDb = await prisma.product.findUnique({
        where: { id: product2.id },
      });

      expect(product1InDb?.quantity).toBe(3); // 5 - 2
      expect(product2InDb?.quantity).toBe(2); // 3 - 1
    });
  });

  describe('findAll', () => {
    it('should return all sales', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'user@example.com',
          password: 'hashedpassword',
          firstName: 'Test',
          lastName: 'User',
        },
      });

      const category = await prisma.category.create({
        data: {
          name: 'Electronics',
        },
      });

      const product = await prisma.product.create({
        data: {
          name: 'iPhone 14',
          sku: 'IPH14-128',
          price: 999.99,
          quantity: 10,
          categoryId: category.id,
        },
      });

      // Create two sales
      await service.create({
        items: [
          {
            productId: product.id,
            quantity: 1,
          },
        ],
        paymentMethod: PaymentMethod.CASH,
      }, user.id);

      await service.create({
        items: [
          {
            productId: product.id,
            quantity: 2,
          },
        ],
        paymentMethod: PaymentMethod.CARD,
      }, user.id);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].totalAmount).toBe(1999.98); // Most recent first
      expect(result[1].totalAmount).toBe(999.99);
    });

    it('should return empty array if no sales exist', async () => {
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return sale by id', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'user@example.com',
          password: 'hashedpassword',
          firstName: 'Test',
          lastName: 'User',
        },
      });

      const category = await prisma.category.create({
        data: {
          name: 'Electronics',
        },
      });

      const product = await prisma.product.create({
        data: {
          name: 'iPhone 14',
          sku: 'IPH14-128',
          price: 999.99,
          quantity: 10,
          categoryId: category.id,
        },
      });

      const createdSale = await service.create({
        items: [
          {
            productId: product.id,
            quantity: 1,
          },
        ],
        paymentMethod: PaymentMethod.CASH,
      }, user.id);

      const result = await service.findOne(createdSale.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(createdSale.id);
      expect(result.totalAmount).toBe(999.99);
    });

    it('should throw error if sale not found', async () => {
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'Sale with ID non-existent-id not found',
      );
    });
  });

  describe('cancelSale', () => {
    it('should successfully cancel a sale and restore stock', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'user@example.com',
          password: 'hashedpassword',
          firstName: 'Test',
          lastName: 'User',
        },
      });

      const category = await prisma.category.create({
        data: {
          name: 'Electronics',
        },
      });

      const product = await prisma.product.create({
        data: {
          name: 'iPhone 14',
          sku: 'IPH14-128',
          price: 999.99,
          quantity: 10,
          categoryId: category.id,
        },
      });

      const createdSale = await service.create({
        items: [
          {
            productId: product.id,
            quantity: 3,
          },
        ],
        paymentMethod: PaymentMethod.CASH,
      }, user.id);

      // Verify stock was reduced
      const productBeforeCancel = await prisma.product.findUnique({
        where: { id: product.id },
      });
      expect(productBeforeCancel?.quantity).toBe(7); // 10 - 3

      // Cancel sale
      const cancelledSale = await service.cancelSale(createdSale.id);

      expect(cancelledSale.status).toBe(SaleStatus.CANCELLED);

      // Verify stock was restored
      const productAfterCancel = await prisma.product.findUnique({
        where: { id: product.id },
      });
      expect(productAfterCancel?.quantity).toBe(10); // 7 + 3
    });

    it('should throw error if sale is already cancelled', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'user@example.com',
          password: 'hashedpassword',
          firstName: 'Test',
          lastName: 'User',
        },
      });

      const category = await prisma.category.create({
        data: {
          name: 'Electronics',
        },
      });

      const product = await prisma.product.create({
        data: {
          name: 'iPhone 14',
          sku: 'IPH14-128',
          price: 999.99,
          quantity: 10,
          categoryId: category.id,
        },
      });

      const createdSale = await service.create({
        items: [
          {
            productId: product.id,
            quantity: 1,
          },
        ],
        paymentMethod: PaymentMethod.CASH,
      }, user.id);

      // Cancel sale first time
      await service.cancelSale(createdSale.id);

      // Try to cancel again
      await expect(service.cancelSale(createdSale.id)).rejects.toThrow(
        'Sale is already cancelled',
      );
    });

    it('should throw error if sale not found', async () => {
      await expect(service.cancelSale('non-existent-id')).rejects.toThrow(
        'Sale with ID non-existent-id not found',
      );
    });
  });

  describe('getSalesReport', () => {
    it('should generate sales report with correct calculations', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'user@example.com',
          password: 'hashedpassword',
          firstName: 'Test',
          lastName: 'User',
        },
      });

      const category = await prisma.category.create({
        data: {
          name: 'Electronics',
        },
      });

      const product1 = await prisma.product.create({
        data: {
          name: 'iPhone 14',
          sku: 'IPH14-128',
          price: 999.99,
          quantity: 10,
          categoryId: category.id,
        },
      });

      const product2 = await prisma.product.create({
        data: {
          name: 'iPad Pro',
          sku: 'IPAD-256',
          price: 799.99,
          quantity: 5,
          categoryId: category.id,
        },
      });

      // Create sales
      await service.create({
        items: [
          {
            productId: product1.id,
            quantity: 2,
          },
        ],
        paymentMethod: PaymentMethod.CASH,
        taxAmount: 100.00,
      }, user.id);

      await service.create({
        items: [
          {
            productId: product2.id,
            quantity: 1,
          },
        ],
        paymentMethod: PaymentMethod.CARD,
        discount: 50.00,
      }, user.id);

      const report = await service.getSalesReport();

      expect(report.totalSales).toBe(2);
      expect(report.totalRevenue).toBe(2749.97); // (999.99 * 2) + (799.99 - 50)
      expect(report.totalTax).toBe(100.00);
      expect(report.totalDiscount).toBe(50.00);
      expect(report.averageSaleValue).toBe(1374.985); // 2749.97 / 2

      // Check payment method stats
      expect(report.paymentMethodStats.CASH).toBe(1);
      expect(report.paymentMethodStats.CARD).toBe(1);
    });

    it('should return report with zero values if no sales', async () => {
      const report = await service.getSalesReport();

      expect(report.totalSales).toBe(0);
      expect(report.totalRevenue).toBe(0);
      expect(report.totalTax).toBe(0);
      expect(report.totalDiscount).toBe(0);
      expect(report.averageSaleValue).toBe(0);
      expect(report.paymentMethodStats).toEqual({});
    });
  });
});
