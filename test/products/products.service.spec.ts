import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from '../../src/products/products.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ProductsService', () => {
  let service: ProductsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    product: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      fields: {
        minQuantity: 'minQuantity',
      },
    },
    category: {
      findUnique: jest.fn(),
    },
    supplier: {
      findUnique: jest.fn(),
    },
  };

  const mockProduct = {
    id: 'product-id-123',
    name: 'iPhone 14',
    description: 'Latest iPhone model',
    sku: 'IPH14-128-BLK',
    barcode: '1234567890123',
    price: 999.99,
    costPrice: 799.99,
    quantity: 50,
    minQuantity: 5,
    categoryId: 'category-id-123',
    supplierId: 'supplier-id-123',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: {
      id: 'category-id-123',
      name: 'Electronics',
    },
    supplier: {
      id: 'supplier-id-123',
      name: 'Apple Inc.',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createProductDto = {
      name: 'iPhone 14',
      description: 'Latest iPhone model',
      sku: 'IPH14-128-BLK',
      barcode: '1234567890123',
      price: 999.99,
      costPrice: 799.99,
      quantity: 50,
      minQuantity: 5,
      categoryId: 'category-id-123',
      supplierId: 'supplier-id-123',
      isActive: true,
    };

    it('should create a product successfully', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({ id: 'category-id-123', name: 'Electronics' });
      mockPrismaService.supplier.findUnique.mockResolvedValue({ id: 'supplier-id-123', name: 'Apple Inc.' });
      mockPrismaService.product.findUnique.mockResolvedValue(null);
      mockPrismaService.product.create.mockResolvedValue(mockProduct);

      const result = await service.create(createProductDto);

      expect(mockPrismaService.category.findUnique).toHaveBeenCalledWith({
        where: { id: createProductDto.categoryId },
      });
      expect(mockPrismaService.supplier.findUnique).toHaveBeenCalledWith({
        where: { id: createProductDto.supplierId },
      });
      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
        where: { sku: createProductDto.sku },
      });
      expect(mockPrismaService.product.create).toHaveBeenCalledWith({
        data: {
          name: createProductDto.name,
          description: createProductDto.description,
          sku: createProductDto.sku,
          barcode: createProductDto.barcode,
          price: createProductDto.price,
          costPrice: createProductDto.costPrice,
          quantity: createProductDto.quantity,
          minQuantity: createProductDto.minQuantity,
          isActive: createProductDto.isActive,
          categoryId: createProductDto.categoryId,
          supplierId: createProductDto.supplierId,
        },
        include: {
          category: {
            select: { id: true, name: true },
          },
          supplier: {
            select: { id: true, name: true },
          },
        },
      });
      expect(result).toEqual(mockProduct);
    });

    it('should throw BadRequestException when category not found', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.create(createProductDto)).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.product.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when supplier not found', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({ id: 'category-id-123', name: 'Electronics' });
      mockPrismaService.supplier.findUnique.mockResolvedValue(null);

      await expect(service.create(createProductDto)).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.product.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when SKU already exists', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({ id: 'category-id-123', name: 'Electronics' });
      mockPrismaService.supplier.findUnique.mockResolvedValue({ id: 'supplier-id-123', name: 'Apple Inc.' });
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      await expect(service.create(createProductDto)).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.product.create).not.toHaveBeenCalled();
    });

    it('should create product without supplier', async () => {
      const createDtoWithoutSupplier = { ...createProductDto };
      delete createDtoWithoutSupplier.supplierId;

      mockPrismaService.category.findUnique.mockResolvedValue({ id: 'category-id-123', name: 'Electronics' });
      mockPrismaService.product.findUnique.mockResolvedValue(null);
      mockPrismaService.product.create.mockResolvedValue({ ...mockProduct, supplier: null });

      const result = await service.create(createDtoWithoutSupplier);

      expect(mockPrismaService.supplier.findUnique).not.toHaveBeenCalled();
      expect(result.supplier).toBeNull();
    });

    it('should handle database errors during creation', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({ id: 'category-id-123', name: 'Electronics' });
      mockPrismaService.supplier.findUnique.mockResolvedValue({ id: 'supplier-id-123', name: 'Apple Inc.' });
      mockPrismaService.product.findUnique.mockResolvedValue(null);
      mockPrismaService.product.create.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createProductDto)).rejects.toThrow('Database error');
    });
  });

  describe('findAll', () => {
    it('should return all products with relations', async () => {
      const products = [mockProduct, { ...mockProduct, id: 'product-id-456' }];
      mockPrismaService.product.findMany.mockResolvedValue(products);

      const result = await service.findAll();

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: {
          category: {
            select: { id: true, name: true },
          },
          supplier: {
            select: { id: true, name: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toEqual(products);
    });

    it('should handle empty result', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockPrismaService.product.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.findAll()).rejects.toThrow('Database error');
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.findOne('product-id-123');

      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'product-id-123' },
        include: {
          category: {
            select: { id: true, name: true },
          },
          supplier: {
            select: { id: true, name: true },
          },
        },
      });
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should handle database errors', async () => {
      mockPrismaService.product.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.findOne('product-id-123')).rejects.toThrow('Database error');
    });
  });

  describe('findBySku', () => {
    it('should return a product by SKU', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.findBySku('IPH14-128-BLK');

      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
        where: { sku: 'IPH14-128-BLK' },
        include: {
          category: {
            select: { id: true, name: true },
          },
          supplier: {
            select: { id: true, name: true },
          },
        },
      });
      expect(result).toEqual(mockProduct);
    });

    it('should return null when product not found by SKU', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      const result = await service.findBySku('NON-EXISTENT-SKU');

      expect(result).toBeNull();
    });
  });

  describe('findByBarcode', () => {
    it('should return a product by barcode', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);

      const result = await service.findByBarcode('1234567890123');

      expect(mockPrismaService.product.findFirst).toHaveBeenCalledWith({
        where: { 
          barcode: '1234567890123',
          isActive: true 
        },
        include: {
          category: {
            select: { id: true, name: true },
          },
          supplier: {
            select: { id: true, name: true },
          },
        },
      });
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product not found by barcode', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(null);

      await expect(service.findByBarcode('invalid-barcode')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getLowStockProducts', () => {
    it('should return products with low stock', async () => {
      const lowStockProducts = [
        { ...mockProduct, quantity: 2, minQuantity: 5 },
        { ...mockProduct, id: 'product-2', quantity: 1, minQuantity: 10 },
      ];
      mockPrismaService.product.findMany.mockResolvedValue(lowStockProducts);

      const result = await service.getLowStockProducts();

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          quantity: {
            lte: mockPrismaService.product.fields.minQuantity,
          },
        },
        include: {
          category: {
            select: { id: true, name: true },
          },
          supplier: {
            select: { id: true, name: true },
          },
        },
        orderBy: {
          quantity: 'asc',
        },
      });
      expect(result).toEqual(lowStockProducts);
    });

    it('should handle empty low stock result', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      const result = await service.getLowStockProducts();

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    const updateProductDto = {
      name: 'iPhone 14 Pro',
      price: 1099.99,
    };

    it('should update a product successfully', async () => {
      const updatedProduct = { ...mockProduct, ...updateProductDto };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.product.update.mockResolvedValue(updatedProduct);

      const result = await service.update('product-id-123', updateProductDto);

      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'product-id-123' },
      });
      expect(mockPrismaService.product.update).toHaveBeenCalledWith({
        where: { id: 'product-id-123' },
        data: updateProductDto,
        include: {
          category: {
            select: { id: true, name: true },
          },
          supplier: {
            select: { id: true, name: true },
          },
        },
      });
      expect(result).toEqual(updatedProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent-id', updateProductDto)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });

    it('should handle SKU conflict during update', async () => {
      const updateWithSku = { ...updateProductDto, sku: 'EXISTING-SKU' };
      const existingProduct = { ...mockProduct, id: 'different-id', sku: 'EXISTING-SKU' };
      
      mockPrismaService.product.findUnique
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(existingProduct);

      await expect(service.update('product-id-123', updateWithSku)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStock', () => {
    it('should update product stock successfully', async () => {
      const updatedProduct = { ...mockProduct, quantity: 75 };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.product.update.mockResolvedValue(updatedProduct);

      const result = await service.updateStock('product-id-123', 25);

      expect(mockPrismaService.product.update).toHaveBeenCalledWith({
        where: { id: 'product-id-123' },
        data: { quantity: 75 },
        include: {
          category: {
            select: { id: true, name: true },
          },
          supplier: {
            select: { id: true, name: true },
          },
        },
      });
      expect(result).toEqual(updatedProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.updateStock('non-existent-id', 75)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for insufficient stock', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      await expect(service.updateStock('product-id-123', -100)).rejects.toThrow(BadRequestException);
    });
  });

  describe('toggleProductStatus', () => {
    it('should toggle product status successfully', async () => {
      const toggledProduct = { ...mockProduct, isActive: false };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.product.update.mockResolvedValue(toggledProduct);

      const result = await service.toggleProductStatus('product-id-123');

      expect(mockPrismaService.product.update).toHaveBeenCalledWith({
        where: { id: 'product-id-123' },
        data: { isActive: false },
        include: {
          category: {
            select: { id: true, name: true },
          },
          supplier: {
            select: { id: true, name: true },
          },
        },
      });
      expect(result).toEqual(toggledProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.toggleProductStatus('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a product successfully', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.product.delete.mockResolvedValue(mockProduct);

      const result = await service.remove('product-id-123');

      expect(mockPrismaService.product.delete).toHaveBeenCalledWith({
        where: { id: 'product-id-123' },
      });
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.product.delete).not.toHaveBeenCalled();
    });

    it('should handle database errors during deletion', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.product.delete.mockRejectedValue(new Error('Foreign key constraint'));

      await expect(service.remove('product-id-123')).rejects.toThrow('Foreign key constraint');
    });
  });
});
