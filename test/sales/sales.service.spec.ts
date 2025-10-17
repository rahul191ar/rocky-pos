import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from '../../src/sales/sales.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';

describe('SalesService', () => {
  let service: SalesService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    $transaction: jest.fn(),
    sale: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    saleItem: {
      createMany: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
    },
  };

  const mockProduct = {
    id: 'product-id-123',
    name: 'iPhone 14',
    sku: 'IPH14-128-BLK',
    price: 999.99,
    quantity: 50,
    isActive: true,
  };

  const mockCustomer = {
    id: 'customer-id-123',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
  };

  const mockSaleItem = {
    productId: 'product-id-123',
    quantity: 2,
    unitPrice: 999.99,
    totalPrice: 1999.98,
  };

  const mockSale = {
    id: 'sale-id-123',
    customerId: 'customer-id-123',
    userId: 'user-id-123',
    totalAmount: 1999.98,
    discount: 0,
    taxAmount: 0,
    finalAmount: 1999.98,
    paymentMethod: PaymentMethod.CASH,
    status: 'COMPLETED',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    customer: mockCustomer,
    user: { id: 'user-id-123', firstName: 'Admin', lastName: 'User' },
    items: [
      {
        ...mockSaleItem,
        product: mockProduct,
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createSaleDto = {
      customerId: 'customer-id-123',
      paymentMethod: PaymentMethod.CASH,
      items: [
        {
          productId: 'product-id-123',
          quantity: 2,
        },
      ],
    };

    it('should create a sale successfully', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.sale.create.mockResolvedValue(mockSale);

      const result = await service.create(createSaleDto, 'user-id-123');

      expect(mockPrismaService.customer.findUnique).toHaveBeenCalledWith({
        where: { id: createSaleDto.customerId },
      });
      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: createSaleDto.items[0].productId },
      });
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException when customer does not exist', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      await expect(service.create(createSaleDto, 'user-id-123')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when product does not exist', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.create(createSaleDto, 'user-id-123')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when product is not active', async () => {
      const inactiveProduct = { ...mockProduct, isActive: false };
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.product.findUnique.mockResolvedValue(inactiveProduct);

      await expect(service.create(createSaleDto, 'user-id-123')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when insufficient stock', async () => {
      const lowStockProduct = { ...mockProduct, quantity: 1 };
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.product.findUnique.mockResolvedValue(lowStockProduct);

      await expect(service.create(createSaleDto, 'user-id-123')).rejects.toThrow(BadRequestException);
    });

    it('should handle empty items array', async () => {
      const emptySaleDto = { ...createSaleDto, items: [] };
      
      // Empty items will cause issues when calculating total
      await expect(service.create(emptySaleDto, 'user-id-123')).rejects.toThrow();
    });

    it('should calculate total amount correctly', async () => {
      const multiItemSaleDto = {
        ...createSaleDto,
        items: [
          { productId: 'product-1', quantity: 2 },
          { productId: 'product-2', quantity: 1 },
        ],
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.sale.create.mockResolvedValue({
        ...mockSale,
        totalAmount: 2999.97,
        finalAmount: 2999.97,
      });

      const result = await service.create(multiItemSaleDto, 'user-id-123');

      expect(result.totalAmount).toBe(2999.97);
    });
  });

  describe('findAll', () => {
    it('should return all sales with relations', async () => {
      const sales = [mockSale, { ...mockSale, id: 'sale-id-456' }];
      mockPrismaService.sale.findMany.mockResolvedValue(sales);

      const result = await service.findAll();

      expect(mockPrismaService.sale.findMany).toHaveBeenCalledWith({
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true },
          },
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toBeDefined();
    });

    it('should handle empty result', async () => {
      mockPrismaService.sale.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockPrismaService.sale.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.findAll()).rejects.toThrow('Database error');
    });
  });

  describe('findOne', () => {
    it('should return a sale by id', async () => {
      mockPrismaService.sale.findUnique.mockResolvedValue(mockSale);

      const result = await service.findOne('sale-id-123');

      expect(mockPrismaService.sale.findUnique).toHaveBeenCalledWith({
        where: { id: 'sale-id-123' },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true },
          },
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true },
              },
            },
          },
        },
      });
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when sale not found', async () => {
      mockPrismaService.sale.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should handle database errors', async () => {
      mockPrismaService.sale.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.findOne('sale-id-123')).rejects.toThrow('Database error');
    });
  });

  describe('getSalesByCustomer', () => {
    it('should return sales for a specific customer', async () => {
      const customerSales = [mockSale];
      mockPrismaService.sale.findMany.mockResolvedValue(customerSales);

      const result = await service.getSalesByCustomer('customer-id-123');

      expect(mockPrismaService.sale.findMany).toHaveBeenCalledWith({
        where: { customerId: 'customer-id-123' },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true },
          },
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toBeDefined();
    });

    it('should handle empty result for customer with no sales', async () => {
      mockPrismaService.sale.findMany.mockResolvedValue([]);

      const result = await service.getSalesByCustomer('customer-no-sales');

      expect(result).toEqual([]);
    });
  });

  describe('getSalesByDateRange', () => {
    const startDate = new Date('2023-10-01');
    const endDate = new Date('2023-10-31');

    it('should return sales within date range', async () => {
      const dateRangeSales = [mockSale];
      mockPrismaService.sale.findMany.mockResolvedValue(dateRangeSales);

      const result = await service.getSalesByDateRange(startDate, endDate);

      expect(mockPrismaService.sale.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true },
          },
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toBeDefined();
    });

    it('should handle invalid date range', async () => {
      const invalidStartDate = new Date('2023-10-31');
      const invalidEndDate = new Date('2023-10-01');

      await expect(service.getSalesByDateRange(invalidStartDate, invalidEndDate))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('updateSaleStatus', () => {
    it('should update sale status successfully', async () => {
      const updatedSale = { ...mockSale, status: 'CANCELLED' };
      mockPrismaService.sale.findUnique.mockResolvedValue(mockSale);
      mockPrismaService.sale.update.mockResolvedValue(updatedSale);

      const result = await service.updateSaleStatus('sale-id-123', 'CANCELLED');

      expect(mockPrismaService.sale.update).toHaveBeenCalledWith({
        where: { id: 'sale-id-123' },
        data: { status: 'CANCELLED' },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true },
          },
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true },
              },
            },
          },
        },
      });
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when sale not found', async () => {
      mockPrismaService.sale.findUnique.mockResolvedValue(null);

      await expect(service.updateSaleStatus('non-existent-id', 'CANCELLED'))
        .rejects.toThrow(NotFoundException);
    });

    it('should handle invalid status values', async () => {
      mockPrismaService.sale.findUnique.mockResolvedValue(mockSale);

      await expect(service.updateSaleStatus('sale-id-123', 'INVALID_STATUS'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getTotalSalesAmount', () => {
    it('should calculate total sales amount for date range', async () => {
      const startDate = new Date('2023-10-01');
      const endDate = new Date('2023-10-31');
      const salesData = [
        { finalAmount: 1000.00 },
        { finalAmount: 500.00 },
        { finalAmount: 750.00 },
      ];
      
      mockPrismaService.sale.findMany.mockResolvedValue(salesData);

      const result = await service.getTotalSalesAmount(startDate, endDate);

      expect(mockPrismaService.sale.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          status: 'COMPLETED',
        },
        select: {
          finalAmount: true,
        },
      });
      expect(result).toBe(2250.00);
    });

    it('should return 0 for no sales in date range', async () => {
      const startDate = new Date('2023-10-01');
      const endDate = new Date('2023-10-31');
      
      mockPrismaService.sale.findMany.mockResolvedValue([]);

      const result = await service.getTotalSalesAmount(startDate, endDate);

      expect(result).toBe(0);
    });
  });

  describe('getSalesCount', () => {
    it('should return sales count for date range', async () => {
      const startDate = new Date('2023-10-01');
      const endDate = new Date('2023-10-31');
      const salesCount = 25;
      
      mockPrismaService.sale.count.mockResolvedValue(salesCount);

      const result = await service.getSalesCount(startDate, endDate);

      expect(mockPrismaService.sale.count).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          status: 'COMPLETED',
        },
      });
      expect(result).toBe(salesCount);
    });

    it('should return 0 for no sales in date range', async () => {
      const startDate = new Date('2023-10-01');
      const endDate = new Date('2023-10-31');
      
      mockPrismaService.sale.count.mockResolvedValue(0);

      const result = await service.getSalesCount(startDate, endDate);

      expect(result).toBe(0);
    });
  });

  describe('remove', () => {
    it('should delete a sale successfully', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });
      mockPrismaService.sale.findUnique.mockResolvedValue(mockSale);
      mockPrismaService.sale.delete.mockResolvedValue(mockSale);

      const result = await service.remove('sale-id-123');

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBe('sale-id-123');
    });

    it('should throw NotFoundException when sale not found', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });
      mockPrismaService.sale.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should restore product quantities when deleting completed sale', async () => {
      const completedSale = { ...mockSale, status: 'COMPLETED' };
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });
      mockPrismaService.sale.findUnique.mockResolvedValue(completedSale);
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.sale.delete.mockResolvedValue(completedSale);

      await service.remove('sale-id-123');

      expect(mockPrismaService.product.update).toHaveBeenCalledWith({
        where: { id: mockSaleItem.productId },
        data: {
          quantity: {
            increment: mockSaleItem.quantity,
          },
        },
      });
    });

    it('should handle database errors during deletion', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });
      mockPrismaService.sale.findUnique.mockResolvedValue(mockSale);
      mockPrismaService.sale.delete.mockRejectedValue(new Error('Foreign key constraint'));

      await expect(service.remove('sale-id-123')).rejects.toThrow('Foreign key constraint');
    });
  });
});
