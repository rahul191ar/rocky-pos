import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { RolesGuard } from '../../src/auth/guards/roles.guard';
import { ROLES_KEY } from '../../src/auth/decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  const createExecutionContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access when no roles are required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      
      const context = createExecutionContext({ role: Role.USER, isActive: true });
      
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user has required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
      
      const user = { role: Role.ADMIN, isActive: true };
      const context = createExecutionContext(user);
      
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user has higher role than required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.MANAGER]);
      
      const user = { role: Role.ADMIN, isActive: true };
      const context = createExecutionContext(user);
      
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow SUPER_ADMIN access to any protected route', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
      
      const user = { role: Role.SUPER_ADMIN, isActive: true };
      const context = createExecutionContext(user);
      
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny access when user role is lower than required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
      
      const user = { role: Role.CASHIER, isActive: true };
      const context = createExecutionContext(user);
      
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Access denied. Required roles: ADMIN. Your role: CASHIER'
      );
    });

    it('should allow access when user has one of multiple required roles', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN, Role.MANAGER]);
      
      const user = { role: Role.MANAGER, isActive: true };
      const context = createExecutionContext(user);
      
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException when user is not authenticated', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
      
      const context = createExecutionContext(null);
      
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('User not authenticated');
    });

    it('should throw ForbiddenException when user has no role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
      
      const user = { isActive: true };
      const context = createExecutionContext(user);
      
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('User role not found');
    });

    it('should throw ForbiddenException when user is inactive', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
      
      const user = { role: Role.ADMIN, isActive: false };
      const context = createExecutionContext(user);
      
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('User account is inactive');
    });

    it('should handle role hierarchy correctly', () => {
      const testCases = [
        { userRole: Role.USER, requiredRole: Role.USER, shouldPass: true },
        { userRole: Role.CASHIER, requiredRole: Role.USER, shouldPass: true },
        { userRole: Role.MANAGER, requiredRole: Role.CASHIER, shouldPass: true },
        { userRole: Role.ADMIN, requiredRole: Role.MANAGER, shouldPass: true },
        { userRole: Role.SUPER_ADMIN, requiredRole: Role.ADMIN, shouldPass: true },
        { userRole: Role.USER, requiredRole: Role.CASHIER, shouldPass: false },
        { userRole: Role.CASHIER, requiredRole: Role.MANAGER, shouldPass: false },
        { userRole: Role.MANAGER, requiredRole: Role.ADMIN, shouldPass: false },
        { userRole: Role.ADMIN, requiredRole: Role.SUPER_ADMIN, shouldPass: false },
      ];

      testCases.forEach(({ userRole, requiredRole, shouldPass }) => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([requiredRole]);
        
        const user = { role: userRole, isActive: true };
        const context = createExecutionContext(user);
        
        if (shouldPass) {
          expect(() => guard.canActivate(context)).not.toThrow();
        } else {
          expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        }
      });
    });

    it('should provide detailed error message with multiple required roles', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN, Role.SUPER_ADMIN]);
      
      const user = { role: Role.MANAGER, isActive: true };
      const context = createExecutionContext(user);
      
      expect(() => guard.canActivate(context)).toThrow(
        'Access denied. Required roles: ADMIN, SUPER_ADMIN. Your role: MANAGER'
      );
    });

    it('should use reflector to get roles from both handler and class', () => {
      const getAllAndOverrideSpy = jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
      
      const context = createExecutionContext({ role: Role.ADMIN, isActive: true });
      
      guard.canActivate(context);
      
      expect(getAllAndOverrideSpy).toHaveBeenCalledWith(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should handle edge case with undefined user properties gracefully', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
      
      const user = { role: Role.ADMIN }; // Missing isActive property
      const context = createExecutionContext(user);
      
      // Should treat undefined isActive as falsy and throw exception
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('User account is inactive');
    });

    it('should allow access when user role exactly matches required role', () => {
      const allRoles = [Role.USER, Role.CASHIER, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN];
      
      allRoles.forEach(role => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([role]);
        
        const user = { role, isActive: true };
        const context = createExecutionContext(user);
        
        expect(guard.canActivate(context)).toBe(true);
      });
    });

    it('should deny access for invalid role combinations', () => {
      // Test that lower roles cannot access higher role requirements
      const invalidCombinations = [
        { userRole: Role.USER, requiredRoles: [Role.CASHIER, Role.MANAGER] },
        { userRole: Role.CASHIER, requiredRoles: [Role.MANAGER, Role.ADMIN] },
        { userRole: Role.MANAGER, requiredRoles: [Role.ADMIN, Role.SUPER_ADMIN] },
      ];

      invalidCombinations.forEach(({ userRole, requiredRoles }) => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);
        
        const user = { role: userRole, isActive: true };
        const context = createExecutionContext(user);
        
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      });
    });
  });
});