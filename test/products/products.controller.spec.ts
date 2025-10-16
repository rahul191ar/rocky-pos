import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from '../../src/products/products.controller';
import { ProductsService } from '../../src/products/products.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TestDatabase } from '../test-database';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    await TestDatabase.setup();
  });

  afterAll(async () => {
    await TestDatabase.teardown();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: TestDatabase.getPrisma(),
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);
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

  describe('findByBarcode', () => {
    it('should return product by barcode', async () => {
      // Setup test data
      const category = await prisma.category.create({
        data: { name: 'Electronics', description: 'Electronic items' },
      });

      const supplier = await prisma.supplier.create({
        data: { name: 'Apple Inc.', contactPerson: 'John Doe' },
      });

      const createProductDto = {
        name: 'iPhone 14',
        description: 'Latest iPhone model',
        sku: 'IPH14-128',
        barcode: '1234567890123',
        price: 999.99,
        costPrice: 800.00,
        quantity: 10,
        minQuantity: 5,
        categoryId: category.id,
        supplierId: supplier.id,
      };

      await service.create(createProductDto);

      // Test the controller endpoint
      const result = await controller.findByBarcode('1234567890123');

      expect(result).toBeDefined();
      expect(result.barcode).toBe('1234567890123');
      expect(result.name).toBe('iPhone 14');
      expect(result.sku).toBe('IPH14-128');
      expect(result.price).toBe(999.99);
      expect(result.isActive).toBe(true);
      expect(result.category).toBeDefined();
      expect(result.category?.name).toBe('Electronics');
      expect(result.supplier).toBeDefined();
      expect(result.supplier?.name).toBe('Apple Inc.');
    });

    it('should throw NotFoundException when product with barcode not found', async () => {
      await expect(controller.findByBarcode('NON-EXISTENT-BARCODE')).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.findByBarcode('NON-EXISTENT-BARCODE')).rejects.toThrow(
        'Product with barcode NON-EXISTENT-BARCODE not found',
      );
    });

    it('should throw BadRequestException when barcode is empty', async () => {
      await expect(controller.findByBarcode('')).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.findByBarcode('')).rejects.toThrow(
        'Barcode cannot be empty',
      );
    });

    it('should throw BadRequestException when barcode is only whitespace', async () => {
      await expect(controller.findByBarcode('   ')).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.findByBarcode('   ')).rejects.toThrow(
        'Barcode cannot be empty',
      );
    });

    it('should handle special characters in barcode', async () => {
      const category = await prisma.category.create({
        data: { name: 'Books' },
      });

      const createProductDto = {
        name: 'Special ISBN Book',
        sku: 'BOOK-001',
        barcode: 'ISBN-978-0-123456-78-9',
        price: 25.99,
        categoryId: category.id,
      };

      await service.create(createProductDto);

      const result = await controller.findByBarcode('ISBN-978-0-123456-78-9');

      expect(result).toBeDefined();
      expect(result.barcode).toBe('ISBN-978-0-123456-78-9');
      expect(result.name).toBe('Special ISBN Book');
    });

    it('should not return inactive products', async () => {
      const category = await prisma.category.create({
        data: { name: 'Electronics' },
      });

      // Create inactive product directly in database
      await prisma.product.create({
        data: {
          name: 'Inactive Product',
          sku: 'INACTIVE-001',
          barcode: '9876543210987',
          price: 50.00,
          categoryId: category.id,
          isActive: false,
        },
      });

      await expect(controller.findByBarcode('9876543210987')).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.findByBarcode('9876543210987')).rejects.toThrow(
        'Product with barcode 9876543210987 not found',
      );
    });

    it('should handle numeric barcodes', async () => {
      const category = await prisma.category.create({
        data: { name: 'Grocery' },
      });

      const createProductDto = {
        name: 'Coca Cola',
        sku: 'COKE-001',
        barcode: '049000028058',
        price: 1.99,
        categoryId: category.id,
      };

      await service.create(createProductDto);

      const result = await controller.findByBarcode('049000028058');

      expect(result).toBeDefined();
      expect(result.barcode).toBe('049000028058');
      expect(result.name).toBe('Coca Cola');
    });

    it('should be case sensitive', async () => {
      const category = await prisma.category.create({
        data: { name: 'Electronics' },
      });

      const createProductDto = {
        name: 'Case Sensitive Product',
        sku: 'CASE-001',
        barcode: 'AbC123XyZ',
        price: 100.00,
        categoryId: category.id,
      };

      await service.create(createProductDto);

      // Should find with exact case
      const result = await controller.findByBarcode('AbC123XyZ');
      expect(result).toBeDefined();
      expect(result.barcode).toBe('AbC123XyZ');

      // Should not find with different case
      await expect(controller.findByBarcode('abc123xyz')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return product with all required fields', async () => {
      const category = await prisma.category.create({
        data: { name: 'Electronics' },
      });

      const createProductDto = {
        name: 'Complete Product',
        description: 'A product with all fields',
        sku: 'COMPLETE-001',
        barcode: '1111111111111',
        price: 299.99,
        costPrice: 200.00,
        quantity: 50,
        minQuantity: 10,
        categoryId: category.id,
      };

      await service.create(createProductDto);

      const result = await controller.findByBarcode('1111111111111');

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe('Complete Product');
      expect(result.description).toBe('A product with all fields');
      expect(result.sku).toBe('COMPLETE-001');
      expect(result.barcode).toBe('1111111111111');
      expect(result.price).toBe(299.99);
      expect(result.costPrice).toBe(200.00);
      expect(result.quantity).toBe(50);
      expect(result.minQuantity).toBe(10);
      expect(result.categoryId).toBe(category.id);
      expect(result.isActive).toBe(true);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(result.category).toBeDefined();
    });
  });

  describe('integration with other endpoints', () => {
    it('should work alongside other product search methods', async () => {
      const category = await prisma.category.create({
        data: { name: 'Electronics' },
      });

      const createProductDto = {
        name: 'Multi-Search Product',
        sku: 'MULTI-001',
        barcode: '2222222222222',
        price: 199.99,
        categoryId: category.id,
      };

      const createdProduct = await service.create(createProductDto);

      // Should be findable by ID
      const resultById = await controller.findOne(createdProduct.id);
      expect(resultById.id).toBe(createdProduct.id);

      // Should be findable by SKU via search
      const resultBySku = await controller.search('MULTI-001');
      expect(resultBySku).toBeDefined();

      // Should be findable by barcode
      const resultByBarcode = await controller.findByBarcode('2222222222222');
      expect(resultByBarcode.barcode).toBe('2222222222222');

      // All should return the same product
      expect(resultById.id).toBe(resultByBarcode.id);
    });
  });
});