import { Controller, Get, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardSummaryDto } from './dto/dashboard.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async getDashboardSummary(): Promise<DashboardSummaryDto> {
    try {
      return await this.dashboardService.getDashboardSummary();
    } catch (error) {
      throw new HttpException(
        'Failed to fetch dashboard summary',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  getDashboardStats() {
    return this.dashboardService.getDashboardStats();
  }
}
