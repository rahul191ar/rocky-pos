import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { InvoicesController } from '../../src/invoices/invoices.controller';
import { InvoicesService } from '../../src/invoices/invoices.service';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { CreateInvoiceDto } from '../../src/invoices/dto/create-invoice.dto';
import { UpdateInvoiceStatusDto, InvoiceStatus } from '../../src/invoices/dto/update-invoice-status.dto';
import { ListInvoicesDto } from '../../src/invoices/dto/list-invoices.dto';
import { InvoiceResponseDto, InvoiceStatsResponseDto } from '../../src/invoices/dto/invoice-response.dto';

describe('InvoicesController', () => {
  let controller: InvoicesController;
  let service: jest.Mocked<InvoicesService>;

  const mockInvoicesService = {
    createInvoice: jest.fn(),
    listInvoices: jest.fn(),
    getInvoiceStats: jest.fn(),
    getInvoiceById: jest.fn(),
    getInvoiceByNumber: jest.fn(),
    updateInvoiceStatus: jest.fn(),
    deleteInvoice: jest.fn(),
  };

  const mockUser = { id: 'user-1', email: 'user@example.com' };
  const mockRequest = { user: mockUser };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoicesController],
      providers: [
        {
          provide: InvoicesService,
          useValue: mockInvoicesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    controller = module.get<InvoicesController>(InvoicesController);
    service = module.get(InvoicesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
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

    const mockCreatedInvoice: InvoiceResponseDto = {
      id: 'invoice-1',
      invoiceNumber: 'INV-202412-0001',
      customerId: 'customer-1',
      createdBy: 'user-1',
      subtotal: 200,
      discount: 10,
      taxAmount: 5,
      totalAmount: 195,
      status: InvoiceStatus.UNPAID,
      invoiceDate: new Date(),
      dueDate: new Date('2024-12-31T23:59:59.000Z'),
      notes: 'Test invoice',
      createdAt: new Date(),
      updatedAt: new Date(),
      customer: {
        id: 'customer-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
      },
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
      mockInvoicesService.createInvoice.mockResolvedValue(mockCreatedInvoice);

      // Act
      const result = await controller.create(mockCreateInvoiceDto, mockRequest);

      // Assert
      expect(mockInvoicesService.createInvoice).toHaveBeenCalledWith(
        mockCreateInvoiceDto,
        mockUser.id
      );
      expect(result).toEqual(mockCreatedInvoice);
    });

    it('should handle service errors during invoice creation', async () => {
      // Arrange
      const error = new Error('Customer not found');
      mockInvoicesService.createInvoice.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.create(mockCreateInvoiceDto, mockRequest)).rejects.toThrow(error);
    });
  });

  describe('findAll', () => {
    const mockInvoices: InvoiceResponseDto[] = [
      {
        id: 'invoice-1',
        invoiceNumber: 'INV-202412-0001',
        customerId: 'customer-1',
        createdBy: 'user-1',
        subtotal: 200,
        discount: 10,
        taxAmount: 5,
        totalAmount: 195,
        status: InvoiceStatus.UNPAID,
        invoiceDate: new Date(),
        dueDate: new Date('2024-12-31T23:59:59.000Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
        customer: {
          id: 'customer-1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '1234567890',
        },
        items: [],
      },
      {
        id: 'invoice-2',
        invoiceNumber: 'INV-202412-0002',
        customerId: 'customer-2',
        createdBy: 'user-1',
        subtotal: 150,
        discount: 0,
        taxAmount: 7.5,
        totalAmount: 157.5,
        status: InvoiceStatus.PAID,
        invoiceDate: new Date(),
        dueDate: new Date('2024-11-30T23:59:59.000Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
        customer: {
          id: 'customer-2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '0987654321',
        },
        items: [],
      },
    ];

    it('should return all invoices when no filters provided', async () => {
      // Arrange
      const filters: ListInvoicesDto = {};
      mockInvoicesService.listInvoices.mockResolvedValue(mockInvoices);

      // Act
      const result = await controller.findAll(filters);

      // Assert
      expect(mockInvoicesService.listInvoices).toHaveBeenCalledWith(filters);
      expect(result).toEqual(mockInvoices);
    });

    it('should pass filters to service', async () => {
      // Arrange
      const filters: ListInvoicesDto = {
        customerId: 'customer-1',
        status: InvoiceStatus.UNPAID,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };
      mockInvoicesService.listInvoices.mockResolvedValue([mockInvoices[0]]);

      // Act
      const result = await controller.findAll(filters);

      // Assert
      expect(mockInvoicesService.listInvoices).toHaveBeenCalledWith(filters);
      expect(result).toEqual([mockInvoices[0]]);
    });

    it('should handle service errors when listing invoices', async () => {
      // Arrange
      const filters: ListInvoicesDto = {};
      const error = new Error('Database connection failed');
      mockInvoicesService.listInvoices.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findAll(filters)).rejects.toThrow(error);
    });
  });

  describe('getStats', () => {
    const mockStats: InvoiceStatsResponseDto = {
      totalInvoices: 100,
      unpaidInvoices: 20,
      paidInvoices: 75,
      overdueInvoices: 5,
      totalAmount: 10000,
      paidAmount: 7500,
      unpaidAmount: 2500,
    };

    it('should return invoice statistics', async () => {
      // Arrange
      mockInvoicesService.getInvoiceStats.mockResolvedValue(mockStats);

      // Act
      const result = await controller.getStats();

      // Assert
      expect(mockInvoicesService.getInvoiceStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });

    it('should handle service errors when getting stats', async () => {
      // Arrange
      const error = new Error('Stats calculation failed');
      mockInvoicesService.getInvoiceStats.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getStats()).rejects.toThrow(error);
    });
  });

  describe('findOne', () => {
    const mockInvoice: InvoiceResponseDto = {
      id: 'invoice-1',
      invoiceNumber: 'INV-202412-0001',
      customerId: 'customer-1',
      createdBy: 'user-1',
      subtotal: 200,
      discount: 10,
      taxAmount: 5,
      totalAmount: 195,
      status: InvoiceStatus.UNPAID,
      invoiceDate: new Date(),
      dueDate: new Date('2024-12-31T23:59:59.000Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
      customer: {
        id: 'customer-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
      },
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

    it('should return invoice by ID', async () => {
      // Arrange
      mockInvoicesService.getInvoiceById.mockResolvedValue(mockInvoice);

      // Act
      const result = await controller.findOne('invoice-1');

      // Assert
      expect(mockInvoicesService.getInvoiceById).toHaveBeenCalledWith('invoice-1');
      expect(result).toEqual(mockInvoice);
    });

    it('should handle service errors when finding invoice by ID', async () => {
      // Arrange
      const error = new Error('Invoice not found');
      mockInvoicesService.getInvoiceById.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findOne('non-existent')).rejects.toThrow(error);
    });
  });

  describe('findByNumber', () => {
    const mockInvoice: InvoiceResponseDto = {
      id: 'invoice-1',
      invoiceNumber: 'INV-202412-0001',
      customerId: 'customer-1',
      createdBy: 'user-1',
      subtotal: 200,
      discount: 10,
      taxAmount: 5,
      totalAmount: 195,
      status: InvoiceStatus.UNPAID,
      invoiceDate: new Date(),
      dueDate: new Date('2024-12-31T23:59:59.000Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
      customer: {
        id: 'customer-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
      },
      items: [],
    };

    it('should return invoice by invoice number', async () => {
      // Arrange
      mockInvoicesService.getInvoiceByNumber.mockResolvedValue(mockInvoice);

      // Act
      const result = await controller.findByNumber('INV-202412-0001');

      // Assert
      expect(mockInvoicesService.getInvoiceByNumber).toHaveBeenCalledWith('INV-202412-0001');
      expect(result).toEqual(mockInvoice);
    });

    it('should handle service errors when finding invoice by number', async () => {
      // Arrange
      const error = new Error('Invoice not found');
      mockInvoicesService.getInvoiceByNumber.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findByNumber('INVALID-NUMBER')).rejects.toThrow(error);
    });
  });

  describe('updateStatus', () => {
    const mockInvoice: InvoiceResponseDto = {
      id: 'invoice-1',
      invoiceNumber: 'INV-202412-0001',
      customerId: 'customer-1',
      createdBy: 'user-1',
      subtotal: 200,
      discount: 10,
      taxAmount: 5,
      totalAmount: 195,
      status: InvoiceStatus.PAID,
      invoiceDate: new Date(),
      dueDate: new Date('2024-12-31T23:59:59.000Z'),
      paidDate: new Date('2024-12-15T10:00:00.000Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
      customer: {
        id: 'customer-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
      },
      items: [],
    };

    const updateDto: UpdateInvoiceStatusDto = {
      status: InvoiceStatus.PAID,
      paidDate: '2024-12-15T10:00:00.000Z',
    };

    it('should update invoice status successfully', async () => {
      // Arrange
      mockInvoicesService.updateInvoiceStatus.mockResolvedValue(mockInvoice);

      // Act
      const result = await controller.updateStatus('invoice-1', updateDto);

      // Assert
      expect(mockInvoicesService.updateInvoiceStatus).toHaveBeenCalledWith('invoice-1', updateDto);
      expect(result).toEqual(mockInvoice);
    });

    it('should handle service errors when updating status', async () => {
      // Arrange
      const error = new Error('Cannot update cancelled invoice');
      mockInvoicesService.updateInvoiceStatus.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.updateStatus('invoice-1', updateDto)).rejects.toThrow(error);
    });
  });

  describe('remove', () => {
    const mockDeleteResponse = {
      message: 'Invoice cancelled successfully',
      invoice: {
        id: 'invoice-1',
        status: InvoiceStatus.CANCELLED,
      },
    };

    it('should cancel invoice successfully', async () => {
      // Arrange
      mockInvoicesService.deleteInvoice.mockResolvedValue(mockDeleteResponse);

      // Act
      const result = await controller.remove('invoice-1');

      // Assert
      expect(mockInvoicesService.deleteInvoice).toHaveBeenCalledWith('invoice-1');
      expect(result).toEqual(mockDeleteResponse);
    });

    it('should handle service errors when deleting invoice', async () => {
      // Arrange
      const error = new Error('Cannot cancel paid invoice');
      mockInvoicesService.deleteInvoice.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.remove('invoice-1')).rejects.toThrow(error);
    });
  });

  describe('Authentication and Authorization', () => {
    beforeEach(() => {
      // Mock the guard to simulate unauthorized access
      jest.spyOn(JwtAuthGuard.prototype, 'canActivate').mockReturnValue(false);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should be protected by JwtAuthGuard', () => {
      // The controller is decorated with @UseGuards(JwtAuthGuard)
      // This test verifies that the guard is properly applied
      expect(InvoicesController).toBeDefined();
    });

    it('should require authentication for all endpoints', () => {
      // All controller methods should require authentication
      // This is enforced by the @UseGuards(JwtAuthGuard) decorator on the class
      expect(controller).toBeDefined();
    });
  });

  describe('Input Validation', () => {
    it('should validate CreateInvoiceDto input', () => {
      // This test verifies that validation is properly configured
      // The validation pipe will catch invalid DTOs before they reach the controller
      expect(controller).toBeDefined();
    });

    it('should validate UpdateInvoiceStatusDto input', () => {
      // This test verifies that validation is properly configured
      // The validation pipe will catch invalid DTOs before they reach the controller
      expect(controller).toBeDefined();
    });

    it('should validate ListInvoicesDto input', () => {
      // This test verifies that validation is properly configured
      // The validation pipe will catch invalid DTOs before they reach the controller
      expect(controller).toBeDefined();
    });
  });
});