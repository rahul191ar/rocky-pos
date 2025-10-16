import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  getSalesReport() {
    return this.reportsService.getSalesReport();
  }

  @Get('inventory')
  getInventoryReport() {
    return this.reportsService.getInventoryReport();
  }
}
