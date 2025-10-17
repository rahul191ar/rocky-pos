import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto, UpdateSaleDto } from './dto/sale.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Sales')
@ApiBearerAuth()
@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a new sale', 
    description: 'Creates a new sale transaction with multiple items and updates product inventory' 
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Sale created successfully',
    schema: {
      example: {
        id: 'sale-id-123',
        customerId: 'customer-id-123',
        userId: 'user-id-123',
        totalAmount: 1999.98,
        paymentMethod: 'CASH',
        status: 'COMPLETED',
        createdAt: '2023-10-16T10:30:00.000Z',
        customer: {
          id: 'customer-id-123',
          name: 'John Doe',
          email: 'john@example.com'
        },
        saleItems: [
          {
            productId: 'product-id-123',
            quantity: 2,
            unitPrice: 999.99,
            totalPrice: 1999.98,
            product: {
              id: 'product-id-123',
              name: 'iPhone 14'
            }
          }
        ]
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or insufficient stock' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token' })
  @ApiResponse({ status: 404, description: 'Customer or product not found' })
  create(@Body() createSaleDto: CreateSaleDto, @Request() req: any) {
    return this.salesService.create(createSaleDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all sales', 
    description: 'Retrieves all sales transactions with customer and product details' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of all sales retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'sale-id-123' },
          customerId: { type: 'string', example: 'customer-id-123' },
          totalAmount: { type: 'number', example: 1999.98 },
          paymentMethod: { type: 'string', example: 'CASH' },
          status: { type: 'string', example: 'COMPLETED' },
          createdAt: { type: 'string', example: '2023-10-16T10:30:00.000Z' }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token' })
  findAll() {
    return this.salesService.findAll();
  }

  @Get('my-sales')
  @ApiOperation({ 
    summary: 'Get current user sales', 
    description: 'Retrieves all sales transactions created by the authenticated user' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User sales retrieved successfully' 
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token' })
  findMySales(@Request() req: any) {
    return this.salesService.findByUser(req.user.userId);
  }

  @Get('report')
  @ApiOperation({ 
    summary: 'Get sales report', 
    description: 'Generates a comprehensive sales report for the specified date range with revenue analytics' 
  })
  @ApiQuery({ 
    name: 'startDate', 
    required: false, 
    type: String, 
    description: 'Start date for the report (ISO 8601 format)',
    example: '2023-10-01T00:00:00.000Z'
  })
  @ApiQuery({ 
    name: 'endDate', 
    required: false, 
    type: String, 
    description: 'End date for the report (ISO 8601 format)',
    example: '2023-10-31T23:59:59.999Z'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Sales report generated successfully',
    schema: {
      example: {
        totalSales: 150,
        totalRevenue: 49999.50,
        averageSaleAmount: 333.33,
        topProducts: [
          { productId: 'product-1', productName: 'iPhone 14', totalQuantity: 50, totalRevenue: 49999.50 }
        ],
        salesByPaymentMethod: {
          CASH: 75,
          CARD: 60,
          MOBILE: 15
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid date range' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token' })
  getSalesReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.salesService.getSalesReport(start, end);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get sale by ID', 
    description: 'Retrieves detailed information about a specific sale transaction' 
  })
  @ApiParam({ name: 'id', description: 'Sale ID', example: 'sale-id-123' })
  @ApiResponse({ 
    status: 200, 
    description: 'Sale details retrieved successfully' 
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token' })
  @ApiResponse({ status: 404, description: 'Sale not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.salesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Update sale', 
    description: 'Updates an existing sale transaction details' 
  })
  @ApiParam({ name: 'id', description: 'Sale ID', example: 'sale-id-123' })
  @ApiResponse({ 
    status: 200, 
    description: 'Sale updated successfully' 
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token' })
  @ApiResponse({ status: 404, description: 'Sale not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSaleDto: UpdateSaleDto,
  ) {
    return this.salesService.update(id, updateSaleDto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ 
    summary: 'Cancel sale', 
    description: 'Cancels a sale transaction and restores product inventory' 
  })
  @ApiParam({ name: 'id', description: 'Sale ID', example: 'sale-id-123' })
  @ApiResponse({ 
    status: 200, 
    description: 'Sale cancelled successfully',
    schema: {
      example: {
        id: 'sale-id-123',
        status: 'CANCELLED',
        message: 'Sale cancelled and inventory restored'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication token' })
  @ApiResponse({ status: 404, description: 'Sale not found' })
  cancelSale(@Param('id', ParseUUIDPipe) id: string) {
    return this.salesService.cancelSale(id);
  }
}
