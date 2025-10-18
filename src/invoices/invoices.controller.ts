import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto';
import { ListInvoicesDto } from './dto/list-invoices.dto';
import { InvoiceResponseDto, InvoiceStatsResponseDto } from './dto/invoice-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new invoice',
    description: 'Creates a new invoice with customer details, items, and payment information. Automatically calculates totals and generates invoice number.'
  })
  @ApiResponse({
    status: 201,
    description: 'Invoice created successfully',
    type: InvoiceResponseDto
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  create(@Body() createInvoiceDto: CreateInvoiceDto, @Request() req: any) {
    return this.invoicesService.createInvoice(createInvoiceDto, req.user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all invoices with optional filters',
    description: 'Retrieves a list of all invoices with optional filtering by customer, status, and date range.'
  })
  @ApiResponse({
    status: 200,
    description: 'List of invoices retrieved successfully',
    type: [InvoiceResponseDto]
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Query() filters: ListInvoicesDto) {
    return this.invoicesService.listInvoices(filters);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get invoice statistics',
    description: 'Returns comprehensive statistics about invoices including counts by status and total amounts.'
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice statistics retrieved successfully',
    type: InvoiceStatsResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getStats() {
    return this.invoicesService.getInvoiceStats();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get invoice by ID',
    description: 'Retrieves a specific invoice by its unique identifier including all details and items.'
  })
  @ApiParam({ name: 'id', description: 'Invoice unique identifier' })
  @ApiResponse({
    status: 200,
    description: 'Invoice retrieved successfully',
    type: InvoiceResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  findOne(@Param('id') id: string) {
    return this.invoicesService.getInvoiceById(id);
  }

  @Get('number/:invoiceNumber')
  @ApiOperation({
    summary: 'Get invoice by invoice number',
    description: 'Retrieves a specific invoice by its invoice number (e.g., INV-202412-0001).'
  })
  @ApiParam({ name: 'invoiceNumber', description: 'Invoice number in format INV-YYYYMM-XXXX' })
  @ApiResponse({
    status: 200,
    description: 'Invoice retrieved successfully',
    type: InvoiceResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  findByNumber(@Param('invoiceNumber') invoiceNumber: string) {
    return this.invoicesService.getInvoiceByNumber(invoiceNumber);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update invoice status',
    description: 'Updates the status of an invoice (e.g., mark as paid, overdue, cancelled). Optionally set paid date for paid invoices.'
  })
  @ApiParam({ name: 'id', description: 'Invoice unique identifier' })
  @ApiResponse({
    status: 200,
    description: 'Invoice status updated successfully',
    type: InvoiceResponseDto
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid status or cannot update status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateInvoiceStatusDto,
  ) {
    return this.invoicesService.updateInvoiceStatus(id, updateStatusDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Cancel an invoice',
    description: 'Cancels an invoice if it is not already paid. This action cannot be undone.'
  })
  @ApiParam({ name: 'id', description: 'Invoice unique identifier' })
  @ApiResponse({
    status: 200,
    description: 'Invoice cancelled successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Invoice cancelled successfully' },
        invoice: { $ref: '#/components/schemas/InvoiceResponseDto' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - cannot cancel paid invoice' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  remove(@Param('id') id: string) {
    return this.invoicesService.deleteInvoice(id);
  }
}
