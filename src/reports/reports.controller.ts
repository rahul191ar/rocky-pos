import { Controller, Get, UseGuards, Query, ValidationPipe } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  SalesReportQueryDto,
  ExpenseReportQueryDto,
  SalesReportResponseDto,
  ExpenseReportResponseDto,
} from './dto/reports.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  @Roles(Role.MANAGER)
  async getSalesReport(
    @Query(new ValidationPipe({ transform: true })) query: SalesReportQueryDto,
  ): Promise<SalesReportResponseDto> {
    return this.reportsService.getSalesReport(query);
  }

  @Get('expenses')
  @Roles(Role.ADMIN)
  async getExpenseReport(
    @Query(new ValidationPipe({ transform: true })) query: ExpenseReportQueryDto,
  ): Promise<ExpenseReportResponseDto> {
    return this.reportsService.getExpenseReport(query);
  }

  // Legacy endpoints for backward compatibility
  @Get('sales/legacy')
  @Roles(Role.MANAGER)
  getSalesReportLegacy() {
    return this.reportsService.getSalesReportLegacy();
  }

  @Get('inventory')
  @Roles(Role.MANAGER)
  getInventoryReport() {
    return this.reportsService.getInventoryReport();
  }
}
