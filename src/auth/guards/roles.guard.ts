import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!user.role) {
      throw new ForbiddenException('User role not found');
    }

    if (!user.isActive) {
      throw new ForbiddenException('User account is inactive');
    }

    const hasRole = this.checkUserRole(user.role, requiredRoles);
    
    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}. Your role: ${user.role}`
      );
    }

    return true;
  }

  private checkUserRole(userRole: Role, requiredRoles: Role[]): boolean {
    // Define role hierarchy (higher roles inherit permissions from lower roles)
    const roleHierarchy: Record<Role, number> = {
      [Role.USER]: 1,
      [Role.CASHIER]: 2,
      [Role.MANAGER]: 3,
      [Role.ADMIN]: 4,
      [Role.SUPER_ADMIN]: 5,
    };

    const userRoleLevel = roleHierarchy[userRole];
    
    // Check if user's role level meets any of the required role levels
    return requiredRoles.some(requiredRole => {
      const requiredRoleLevel = roleHierarchy[requiredRole];
      return userRoleLevel >= requiredRoleLevel;
    });
  }
}