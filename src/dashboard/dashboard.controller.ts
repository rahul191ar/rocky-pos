import { Controller, Get, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { DashboardSummaryDto } from './dto/dashboard.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @Roles(Role.MANAGER)
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
  @Roles(Role.MANAGER)
  getDashboardStats() {
    return this.dashboardService.getDashboardStats();
  }
}
