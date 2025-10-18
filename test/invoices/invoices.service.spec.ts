import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InvoicesService } from '../../src/invoices/invoices.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { CreateInvoiceDto } from '../../src/invoices/dto/create-invoice.dto';
import { UpdateInvoiceStatusDto, InvoiceStatus } from '../../src/invoices/dto/update-invoice-status.dto';
import { ListInvoicesDto } from '../../src/invoices/dto/list-invoices.dto';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    customer: {
      findUnique: jest.fn(),
    },
    invoice: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createInvoice', () => {
    const mockCustomer = {
      id: 'customer-1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890',
    };

    const mockCreateInvoiceDto: CreateInvoiceDto = {
      customerId: 'customer-1',
      items: [
        {
          productId: 'product-1',
          description: 'Test Product',
          quantity: 2,
          unitPrice: 100,
          discount: 10,
          taxAmount: 5,
        },
      ],
      dueDate: '2024-12-31T23:59:59.000Z',
      notes: 'Test invoice',
    };

    const mockCreatedInvoice = {
      id: 'invoice-1',
      invoiceNumber: 'INV-202412-0001',
      customerId: 'customer-1',
      userId: 'user-1',
      subtotal: 200,
      discount: 10,
      taxAmount: 5,
      totalAmount: 195,
      status: InvoiceStatus.UNPAID,
      dueDate: new Date('2024-12-31T23:59:59.000Z'),
      notes: 'Test invoice',
      createdAt: new Date(),
      updatedAt: new Date(),
      customer: mockCustomer,
      items: [
        {
          id: 'item-1',
          productId: 'product-1',
          description: 'Test Product',
          quantity: 2,
          unitPrice: 100,
          discount: 10,
          taxAmount: 5,
          totalPrice: 195,
        },
      ],
    };

    it('should create an invoice successfully', async () => {
      // Arrange
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.invoice.findFirst.mockResolvedValue(null);
      mockPrismaService.invoice.create.mockResolvedValue(mockCreatedInvoice);

      // Act
      const result = await service.createInvoice(mockCreateInvoiceDto, 'user-1');

      // Assert
      expect(mockPrismaService.customer.findUnique).toHaveBeenCalledWith({
        where: { id: 'customer-1' },
      });
      expect(mockPrismaService.invoice.create).toHaveBeenCalled();
      expect(result).toEqual(mockCreatedInvoice);
      expect(result.invoiceNumber).toMatch(/^INV-\d{6}-\d{4}$/);
    });

    it('should throw NotFoundException when customer does not exist', async () => {
      // Arrange
      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createInvoice(mockCreateInvoiceDto, 'user-1')).rejects.toThrow(
        new NotFoundException('Customer with ID customer-1 not found')
      );
    });

    it('should calculate totals correctly with multiple items', async () => {
      // Arrange
      const dtoWithMultipleItems: CreateInvoiceDto = {
        ...mockCreateInvoiceDto,
        items: [
          { productId: 'product-1', description: 'Item 1', quantity: 2, unitPrice: 100 },
          { productId: 'product-2', description: 'Item 2', quantity: 1, unitPrice: 50, discount: 5 },
        ],
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.invoice.findFirst.mockResolvedValue(null);
      mockPrismaService.invoice.create.mockResolvedValue({
        ...mockCreatedInvoice,
        subtotal: 250, // (2*100) + (1*50) = 250
        discount: 5,   // 5 from second item
        taxAmount: 0,  // no tax in this case
        totalAmount: 245, // 250 - 5 = 245
      });

      // Act
      await service.createInvoice(dtoWithMultipleItems, 'user-1');

      // Assert
      expect(mockPrismaService.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: 250,
            discount: 5,
            totalAmount: 245,
          }),
        })
      );
    });

    it('should generate unique invoice numbers', async () => {
      // Arrange
      const existingInvoice = { id: 'inv-1', invoiceNumber: 'INV-202412-0001' };
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.invoice.findFirst.mockResolvedValue(existingInvoice);
      mockPrismaService.invoice.create.mockResolvedValue({
        ...mockCreatedInvoice,
        invoiceNumber: 'INV-202412-0002',
      });

      // Act
      await service.createInvoice(mockCreateInvoiceDto, 'user-1');

      // Assert
      expect(mockPrismaService.invoice.findFirst).toHaveBeenCalledWith({
        where: {
          invoiceNumber: {
            startsWith: expect.stringMatching(/^INV-\d{6}$/),
          },
        },
        orderBy: {
          invoiceNumber: 'desc',
        },
      });
    });
  });

  describe('listInvoices', () => {
    const mockInvoices = [
      {
        id: 'invoice-1',
        customer: { id: 'customer-1', name: 'John Doe', email: 'john@example.com', phone: '1234567890' },
        items: [],
      },
      {
        id: 'invoice-2',
        customer: { id: 'customer-2', name: 'Jane Smith', email: 'jane@example.com', phone: '0987654321' },
        items: [],
      },
    ];

    it('should return all invoices when no filters provided', async () => {
      // Arrange
      const filters: ListInvoicesDto = {};
      mockPrismaService.invoice.findMany.mockResolvedValue(mockInvoices);

      // Act
      const result = await service.listInvoices(filters);

      // Assert
      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          items: true,
        },
        orderBy: {
          invoiceDate: 'desc',
        },
      });
      expect(result).toEqual(mockInvoices);
    });

    it('should filter by customer ID', async () => {
      // Arrange
      const filters: ListInvoicesDto = { customerId: 'customer-1' };
      mockPrismaService.invoice.findMany.mockResolvedValue([mockInvoices[0]]);

      // Act
      const result = await service.listInvoices(filters);

      // Assert
      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith({
        where: { customerId: 'customer-1' },
        include: expect.any(Object),
        orderBy: { invoiceDate: 'desc' },
      });
      expect(result).toEqual([mockInvoices[0]]);
    });

    it('should filter by status', async () => {
      // Arrange
      const filters: ListInvoicesDto = { status: InvoiceStatus.PAID };
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      // Act
      const result = await service.listInvoices(filters);

      // Assert
      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith({
        where: { status: InvoiceStatus.PAID },
        include: expect.any(Object),
        orderBy: { invoiceDate: 'desc' },
      });
      expect(result).toEqual([]);
    });

    it('should filter by date range', async () => {
      // Arrange
      const filters: ListInvoicesDto = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      // Act
      const result = await service.listInvoices(filters);

      // Assert
      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith({
        where: {
          invoiceDate: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-12-31'),
          },
        },
        include: expect.any(Object),
        orderBy: { invoiceDate: 'desc' },
      });
    });
  });

  describe('getInvoiceById', () => {
    const mockInvoice = {
      id: 'invoice-1',
      customer: { id: 'customer-1', name: 'John Doe' },
      items: [{ product: { name: 'Product 1' } }],
      sale: null,
    };

    it('should return invoice when found', async () => {
      // Arrange
      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

      // Act
      const result = await service.getInvoiceById('invoice-1');

      // Assert
      expect(mockPrismaService.invoice.findUnique).toHaveBeenCalledWith({
        where: { id: 'invoice-1' },
        include: {
          customer: true,
          items: {
            include: {
              product: true,
            },
          },
          sale: true,
        },
      });
      expect(result).toEqual(mockInvoice);
    });

    it('should throw NotFoundException when invoice not found', async () => {
      // Arrange
      mockPrismaService.invoice.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getInvoiceById('non-existent')).rejects.toThrow(
        new NotFoundException('Invoice with ID non-existent not found')
      );
    });
  });

  describe('getInvoiceByNumber', () => {
    const mockInvoice = {
      id: 'invoice-1',
      invoiceNumber: 'INV-202412-0001',
      customer: { id: 'customer-1', name: 'John Doe' },
      items: [{ product: { name: 'Product 1' } }],
      sale: null,
    };

    it('should return invoice when found by number', async () => {
      // Arrange
      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

      // Act
      const result = await service.getInvoiceByNumber('INV-202412-0001');

      // Assert
      expect(mockPrismaService.invoice.findUnique).toHaveBeenCalledWith({
        where: { invoiceNumber: 'INV-202412-0001' },
        include: {
          customer: true,
          items: {
            include: {
              product: true,
            },
          },
          sale: true,
        },
      });
      expect(result).toEqual(mockInvoice);
    });

    it('should throw NotFoundException when invoice number not found', async () => {
      // Arrange
      mockPrismaService.invoice.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getInvoiceByNumber('INVALID-NUMBER')).rejects.toThrow(
        new NotFoundException('Invoice with number INVALID-NUMBER not found')
      );
    });
  });

  describe('updateInvoiceStatus', () => {
    const mockInvoice = {
      id: 'invoice-1',
      status: InvoiceStatus.UNPAID,
      customerId: 'customer-1',
      items: [],
    };

    const updateDto: UpdateInvoiceStatusDto = {
      status: InvoiceStatus.PAID,
      paidDate: '2024-12-15T10:00:00.000Z',
    };

    it('should update invoice status successfully', async () => {
      // Arrange
      const updatedInvoice = { ...mockInvoice, status: InvoiceStatus.PAID, paidDate: new Date() };
      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);
      mockPrismaService.invoice.update.mockResolvedValue(updatedInvoice);

      // Act
      const result = await service.updateInvoiceStatus('invoice-1', updateDto);

      // Assert
      expect(mockPrismaService.invoice.update).toHaveBeenCalledWith({
        where: { id: 'invoice-1' },
        data: {
          status: InvoiceStatus.PAID,
          paidDate: new Date('2024-12-15T10:00:00.000Z'),
        },
        include: {
          customer: true,
          items: true,
        },
      });
      expect(result).toEqual(updatedInvoice);
    });

    it('should throw NotFoundException when invoice not found', async () => {
      // Arrange
      mockPrismaService.invoice.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateInvoiceStatus('non-existent', updateDto)).rejects.toThrow(
        new NotFoundException('Invoice with ID non-existent not found')
      );
    });

    it('should throw BadRequestException when trying to update cancelled invoice', async () => {
      // Arrange
      const cancelledInvoice = { ...mockInvoice, status: InvoiceStatus.CANCELLED };
      mockPrismaService.invoice.findUnique.mockResolvedValue(cancelledInvoice);

      // Act & Assert
      await expect(service.updateInvoiceStatus('invoice-1', updateDto)).rejects.toThrow(
        new BadRequestException('Cannot update status of a cancelled invoice')
      );
    });
  });

  describe('deleteInvoice', () => {
    const mockInvoice = {
      id: 'invoice-1',
      status: InvoiceStatus.UNPAID,
    };

    it('should cancel invoice successfully', async () => {
      // Arrange
      const cancelledInvoice = { ...mockInvoice, status: InvoiceStatus.CANCELLED };
      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);
      mockPrismaService.invoice.update.mockResolvedValue(cancelledInvoice);

      // Act
      const result = await service.deleteInvoice('invoice-1');

      // Assert
      expect(mockPrismaService.invoice.update).toHaveBeenCalledWith({
        where: { id: 'invoice-1' },
        data: {
          status: InvoiceStatus.CANCELLED,
        },
      });
      expect(result).toEqual({
        message: 'Invoice cancelled successfully',
        invoice: cancelledInvoice,
      });
    });

    it('should throw NotFoundException when invoice not found', async () => {
      // Arrange
      mockPrismaService.invoice.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteInvoice('non-existent')).rejects.toThrow(
        new NotFoundException('Invoice with ID non-existent not found')
      );
    });

    it('should throw BadRequestException when trying to cancel paid invoice', async () => {
      // Arrange
      const paidInvoice = { ...mockInvoice, status: InvoiceStatus.PAID };
      mockPrismaService.invoice.findUnique.mockResolvedValue(paidInvoice);

      // Act & Assert
      await expect(service.deleteInvoice('invoice-1')).rejects.toThrow(
        new BadRequestException('Cannot cancel a paid invoice')
      );
    });
  });

  describe('getInvoiceStats', () => {
    it('should return invoice statistics', async () => {
      // Arrange
      mockPrismaService.invoice.count
        .mockResolvedValueOnce(100) // totalInvoices
        .mockResolvedValueOnce(20)  // unpaidInvoices
        .mockResolvedValueOnce(75)  // paidInvoices
        .mockResolvedValueOnce(5);  // overdueInvoices

      mockPrismaService.invoice.aggregate
        .mockResolvedValueOnce({ _sum: { totalAmount: 10000 } }) // totalAmount
        .mockResolvedValueOnce({ _sum: { totalAmount: 7500 } });  // paidAmount

      // Act
      const result = await service.getInvoiceStats();

      // Assert
      expect(mockPrismaService.invoice.count).toHaveBeenCalledTimes(4);
      expect(mockPrismaService.invoice.aggregate).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        totalInvoices: 100,
        unpaidInvoices: 20,
        paidInvoices: 75,
        overdueInvoices: 5,
        totalAmount: 10000,
        paidAmount: 7500,
        unpaidAmount: 2500, // 10000 - 7500
      });
    });
  });
});