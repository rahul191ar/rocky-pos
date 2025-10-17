import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';

@Injectable()
export class JwtRolesGuard extends AuthGuard('jwt') implements CanActivate {
  private rolesGuard: RolesGuard;

  constructor(private reflector: Reflector) {
    super();
    this.rolesGuard = new RolesGuard(reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First, check JWT authentication
    const isAuthenticated = await super.canActivate(context) as boolean;
    
    if (!isAuthenticated) {
      throw new UnauthorizedException('Invalid or missing authentication token');
    }

    // Then, check role-based authorization
    return this.rolesGuard.canActivate(context);
  }
}