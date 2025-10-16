import { Controller, Get, UseGuards, Query, ValidationPipe } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  SalesReportQueryDto,
  ExpenseReportQueryDto,
  SalesReportResponseDto,
  ExpenseReportResponseDto,
} from './dto/reports.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  async getSalesReport(
    @Query(new ValidationPipe({ transform: true })) query: SalesReportQueryDto,
  ): Promise<SalesReportResponseDto> {
    return this.reportsService.getSalesReport(query);
  }

  @Get('expenses')
  async getExpenseReport(
    @Query(new ValidationPipe({ transform: true })) query: ExpenseReportQueryDto,
  ): Promise<ExpenseReportResponseDto> {
    return this.reportsService.getExpenseReport(query);
  }

  // Legacy endpoints for backward compatibility
  @Get('sales/legacy')
  getSalesReportLegacy() {
    return this.reportsService.getSalesReportLegacy();
  }

  @Get('inventory')
  getInventoryReport() {
    return this.reportsService.getInventoryReport();
  }
}
