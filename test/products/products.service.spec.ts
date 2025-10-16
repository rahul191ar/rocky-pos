import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from '../../src/products/products.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TestDatabase } from '../test-database';

describe('ProductsService', () => {
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
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: TestDatabase.getPrisma(),
        },
      ],
    }).compile();

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
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a product', async () => {
      // Create category first
      const category = await prisma.category.create({
        data: {
          name: 'Electronics',
          description: 'Electronic items',
        },
      });

      const createProductDto = {
        name: 'iPhone 14',
        description: 'Latest iPhone model',
        sku: 'IPH14-128',
        price: 999.99,
        costPrice: 800.00,
        quantity: 10,
        minQuantity: 5,
        categoryId: category.id,
      };

      const result = await service.create(createProductDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(createProductDto.name);
      expect(result.sku).toBe(createProductDto.sku);
      expect(result.price).toBe(createProductDto.price);
      expect(result.quantity).toBe(createProductDto.quantity);
      expect(result.categoryId).toBe(category.id);

      // Verify product exists in database
      const productInDb = await prisma.product.findUnique({
        where: { sku: createProductDto.sku },
      });
      expect(productInDb).toBeDefined();
    });

    it('should throw error if category does not exist', async () => {
      const createProductDto = {
        name: 'Test Product',
        sku: 'TEST-001',
        price: 100.00,
        categoryId: 'non-existent-category-id',
      };

      await expect(service.create(createProductDto)).rejects.toThrow(
        'Category with ID non-existent-category-id not found',
      );
    });

    it('should throw error if SKU already exists', async () => {
      // Create category first
      const category = await prisma.category.create({
        data: {
          name: 'Electronics',
        },
      });

      const createProductDto = {
        name: 'iPhone 14',
        sku: 'IPH14-128',
        price: 999.99,
        categoryId: category.id,
      };

      // Create product first
      await service.create(createProductDto);

      // Try to create product with same SKU
      await expect(service.create(createProductDto)).rejects.toThrow(
        'Product with this SKU already exists',
      );
    });
  });

  describe('findAll', () => {
    it('should return all active products', async () => {
      // Create category
      const category = await prisma.category.create({
        data: { name: 'Electronics' },
      });

      // Create products
      const product1 = await service.create({
        name: 'Product 1',
        sku: 'PROD-001',
        price: 100.00,
        categoryId: category.id,
      });

      const product2 = await service.create({
        name: 'Product 2',
        sku: 'PROD-002',
        price: 200.00,
        categoryId: category.id,
      });

      // Create inactive product
      await prisma.product.create({
        data: {
          name: 'Inactive Product',
          sku: 'INACTIVE-001',
          price: 50.00,
          categoryId: category.id,
          isActive: false,
        },
      });

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result.map(p => p.sku)).toEqual(
        expect.arrayContaining(['PROD-001', 'PROD-002'])
      );
    });

    it('should return empty array if no products exist', async () => {
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return product by id', async () => {
      const category = await prisma.category.create({
        data: { name: 'Electronics' },
      });

      const createProductDto = {
        name: 'Test Product',
        sku: 'TEST-001',
        price: 100.00,
        categoryId: category.id,
      };

      const createdProduct = await service.create(createProductDto);

      const result = await service.findOne(createdProduct.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(createdProduct.id);
      expect(result.name).toBe(createProductDto.name);
    });

    it('should throw error if product not found', async () => {
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'Product with ID non-existent-id not found',
      );
    });
  });

  describe('findBySku', () => {
    it('should return product by SKU', async () => {
      const category = await prisma.category.create({
        data: { name: 'Electronics' },
      });

      const createProductDto = {
        name: 'Test Product',
        sku: 'TEST-001',
        price: 100.00,
        categoryId: category.id,
      };

      const createdProduct = await service.create(createProductDto);

      const result = await service.findBySku('TEST-001');

      expect(result).toBeDefined();
      expect(result?.sku).toBe('TEST-001');
    });

    it('should return null if product not found', async () => {
      const result = await service.findBySku('NON-EXISTENT');
      expect(result).toBeNull();
    });
  });

  describe('findByBarcode', () => {
    it('should return product by barcode', async () => {
      const category = await prisma.category.create({
        data: { name: 'Electronics' },
      });

      const createProductDto = {
        name: 'Test Product',
        sku: 'TEST-001',
        barcode: '1234567890123',
        price: 100.00,
        categoryId: category.id,
      };

      await service.create(createProductDto);

      const result = await service.findByBarcode('1234567890123');

      expect(result).toBeDefined();
      expect(result.barcode).toBe('1234567890123');
      expect(result.name).toBe('Test Product');
      expect(result.sku).toBe('TEST-001');
      expect(result.price).toBe(100.00);
      expect(result.isActive).toBe(true);
    });

    it('should return product with category and supplier relations', async () => {
      const category = await prisma.category.create({
        data: { name: 'Electronics', description: 'Electronic items' },
      });

      const supplier = await prisma.supplier.create({
        data: { name: 'Apple Inc.', contactPerson: 'John Doe' },
      });

      const createProductDto = {
        name: 'iPhone 14',
        sku: 'IPH14-128',
        barcode: '1234567890123',
        price: 999.99,
        categoryId: category.id,
        supplierId: supplier.id,
      };

      await service.create(createProductDto);

      const result = await service.findByBarcode('1234567890123');

      expect(result).toBeDefined();
      expect(result.category).toBeDefined();
      expect(result.category?.name).toBe('Electronics');
      expect(result.supplier).toBeDefined();
      expect(result.supplier?.name).toBe('Apple Inc.');
    });

    it('should throw NotFoundException if product with barcode not found', async () => {
      await expect(service.findByBarcode('NON-EXISTENT-BARCODE')).rejects.toThrow(
        'Product with barcode NON-EXISTENT-BARCODE not found',
      );
    });

    it('should throw NotFoundException if product with barcode is inactive', async () => {
      const category = await prisma.category.create({
        data: { name: 'Electronics' },
      });

      // Create inactive product
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

      await expect(service.findByBarcode('9876543210987')).rejects.toThrow(
        'Product with barcode 9876543210987 not found',
      );
    });

    it('should return product even if barcode is null for other products', async () => {
      const category = await prisma.category.create({
        data: { name: 'Electronics' },
      });

      // Create product without barcode
      await service.create({
        name: 'Product Without Barcode',
        sku: 'NO-BARCODE-001',
        price: 100.00,
        categoryId: category.id,
      });

      // Create product with barcode
      await service.create({
        name: 'Product With Barcode',
        sku: 'WITH-BARCODE-001',
        barcode: '1111111111111',
        price: 200.00,
        categoryId: category.id,
      });

      const result = await service.findByBarcode('1111111111111');

      expect(result).toBeDefined();
      expect(result.barcode).toBe('1111111111111');
      expect(result.name).toBe('Product With Barcode');
    });

    it('should handle special characters in barcode', async () => {
      const category = await prisma.category.create({
        data: { name: 'Electronics' },
      });

      const createProductDto = {
        name: 'Special Barcode Product',
        sku: 'SPECIAL-001',
        barcode: 'ABC-123-XYZ',
        price: 150.00,
        categoryId: category.id,
      };

      await service.create(createProductDto);

      const result = await service.findByBarcode('ABC-123-XYZ');

      expect(result).toBeDefined();
      expect(result.barcode).toBe('ABC-123-XYZ');
      expect(result.name).toBe('Special Barcode Product');
    });

    it('should be case sensitive for barcode search', async () => {
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
      const result1 = await service.findByBarcode('AbC123XyZ');
      expect(result1).toBeDefined();

      // Should not find with different case
      await expect(service.findByBarcode('abc123xyz')).rejects.toThrow(
        'Product with barcode abc123xyz not found',
      );
    });
  });

  describe('update', () => {
    it('should successfully update product', async () => {
      const category = await prisma.category.create({
        data: { name: 'Electronics' },
      });

      const createProductDto = {
        name: 'Original Product',
        sku: 'ORIGINAL-001',
        price: 100.00,
        categoryId: category.id,
      };

      const createdProduct = await service.create(createProductDto);

      const updateProductDto = {
        name: 'Updated Product',
        price: 150.00,
      };

      const result = await service.update(createdProduct.id, updateProductDto);

      expect(result.name).toBe(updateProductDto.name);
      expect(result.price).toBe(updateProductDto.price);
      expect(result.sku).toBe(createProductDto.sku); // Should not change
    });

    it('should throw error if product not found', async () => {
      const updateProductDto = {
        name: 'Updated Product',
      };

      await expect(service.update('non-existent-id', updateProductDto)).rejects.toThrow(
        'Product with ID non-existent-id not found',
      );
    });

    it('should throw error if SKU already exists when updating', async () => {
      const category = await prisma.category.create({
        data: { name: 'Electronics' },
      });

      const product1 = await service.create({
        name: 'Product 1',
        sku: 'PROD-001',
        price: 100.00,
        categoryId: category.id,
      });

      const product2 = await service.create({
        name: 'Product 2',
        sku: 'PROD-002',
        price: 200.00,
        categoryId: category.id,
      });

      await expect(service.update(product2.id, { sku: 'PROD-001' })).rejects.toThrow(
        'Product with this SKU already exists',
      );
    });
  });

  describe('updateStock', () => {
    it('should increase product quantity', async () => {
      const category = await prisma.category.create({
        data: { name: 'Electronics' },
      });

      const product = await service.create({
        name: 'Test Product',
        sku: 'TEST-001',
        price: 100.00,
        quantity: 10,
        categoryId: category.id,
      });

      const result = await service.updateStock(product.id, 5);

      expect(result.quantity).toBe(15);

      // Verify in database
      const productInDb = await prisma.product.findUnique({
        where: { id: product.id },
      });
      expect(productInDb?.quantity).toBe(15);
    });

    it('should decrease product quantity', async () => {
      const category = await prisma.category.create({
        data: { name: 'Electronics' },
      });

      const product = await service.create({
        name: 'Test Product',
        sku: 'TEST-001',
        price: 100.00,
        quantity: 10,
        categoryId: category.id,
      });

      const result = await service.updateStock(product.id, -3);

      expect(result.quantity).toBe(7);
    });

    it('should throw error if insufficient stock', async () => {
      const category = await prisma.category.create({
        data: { name: 'Electronics' },
      });

      const product = await service.create({
        name: 'Test Product',
        sku: 'TEST-001',
        price: 100.00,
        quantity: 5,
        categoryId: category.id,
      });

      await expect(service.updateStock(product.id, -10)).rejects.toThrow(
        'Insufficient stock',
      );
    });

    it('should throw error if product not found', async () => {
      await expect(service.updateStock('non-existent-id', 5)).rejects.toThrow(
        'Product with ID non-existent-id not found',
      );
    });
  });

  describe('getLowStockProducts', () => {
    it('should return products with low stock', async () => {
      const category = await prisma.category.create({
        data: { name: 'Electronics' },
      });

      // Create products with different stock levels
      await service.create({
        name: 'Normal Stock',
        sku: 'NORMAL-001',
        price: 100.00,
        quantity: 10,
        minQuantity: 5,
        categoryId: category.id,
      });

      await service.create({
        name: 'Low Stock',
        sku: 'LOW-001',
        price: 100.00,
        quantity: 3,
        minQuantity: 5,
        categoryId: category.id,
      });

      await service.create({
        name: 'Out of Stock',
        sku: 'OUT-001',
        price: 100.00,
        quantity: 0,
        minQuantity: 5,
        categoryId: category.id,
      });

      const result = await service.getLowStockProducts();

      expect(result).toHaveLength(2);
      expect(result.map(p => p.sku)).toEqual(
        expect.arrayContaining(['LOW-001', 'OUT-001'])
      );
    });

    it('should return empty array if no low stock products', async () => {
      const result = await service.getLowStockProducts();
      expect(result).toEqual([]);
    });
  });

  describe('toggleProductStatus', () => {
    it('should toggle product active status', async () => {
      const category = await prisma.category.create({
        data: { name: 'Electronics' },
      });

      const product = await service.create({
        name: 'Test Product',
        sku: 'TEST-001',
        price: 100.00,
        categoryId: category.id,
        isActive: true,
      });

      // Initially active
      expect(product.isActive).toBe(true);

      // Toggle to inactive
      const result1 = await service.toggleProductStatus(product.id);
      expect(result1.isActive).toBe(false);

      // Toggle back to active
      const result2 = await service.toggleProductStatus(product.id);
      expect(result2.isActive).toBe(true);
    });

    it('should throw error if product not found', async () => {
      await expect(service.toggleProductStatus('non-existent-id')).rejects.toThrow(
        'Product with ID non-existent-id not found',
      );
    });
  });
});
