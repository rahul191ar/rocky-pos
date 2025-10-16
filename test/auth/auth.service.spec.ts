import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../../src/auth/auth.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TestDatabase } from '../test-database';
import { Role } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeAll(async () => {
    await TestDatabase.setup();
  });

  afterAll(async () => {
    await TestDatabase.teardown();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: TestDatabase.getPrisma(),
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
            verify: jest.fn().mockReturnValue({ sub: 'user-id', email: 'test@example.com', role: Role.USER }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                'JWT_SECRET': 'test-jwt-secret',
                'JWT_REFRESH_SECRET': 'test-refresh-secret',
                'JWT_EXPIRES_IN': '15m',
                'JWT_REFRESH_EXPIRES_IN': '7d',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    // Clear database before each test
    await prisma.saleItem.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.purchaseItem.deleteMany();
    await prisma.purchase.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.user.deleteMany();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = await service.register(registerDto);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(registerDto.email);
      expect(result.user.firstName).toBe(registerDto.firstName);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();

      // Verify password is hashed in database
      const userInDb = await prisma.user.findUnique({
        where: { email: registerDto.email },
      });
      expect(userInDb).toBeDefined();
      expect(userInDb?.password).not.toBe(registerDto.password);
    });

    it('should throw error if user already exists', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      // Create user first
      await service.register(registerDto);

      // Try to register again
      await expect(service.register(registerDto)).rejects.toThrow(
        'User with this email already exists',
      );
    });

    it('should hash password correctly', async () => {
      const registerDto = {
        email: 'test2@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Doe',
      };

      await service.register(registerDto);

      const userInDb = await prisma.user.findUnique({
        where: { email: registerDto.email },
      });

      expect(userInDb?.password).toBeDefined();
      expect(userInDb?.password).not.toBe(registerDto.password);

      // Verify password can be verified
      const isValidPassword = await bcrypt.compare(
        registerDto.password,
        userInDb?.password || '',
      );
      expect(isValidPassword).toBe(true);
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      // Register user first
      await service.register(registerDto);

      // Login
      const loginDto = {
        email: registerDto.email,
        password: registerDto.password,
      };

      const result = await service.login(loginDto);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(registerDto.email);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw error with invalid email', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw error with invalid password', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      await service.register(registerDto);

      const loginDto = {
        email: registerDto.email,
        password: 'wrongpassword',
      };

      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw error for deactivated user', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      // Register user
      await service.register(registerDto);

      // Deactivate user
      await prisma.user.update({
        where: { email: registerDto.email },
        data: { isActive: false },
      });

      const loginDto = {
        email: registerDto.email,
        password: registerDto.password,
      };

      await expect(service.login(loginDto)).rejects.toThrow(
        'User account is deactivated',
      );
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh token', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const registerResult = await service.register(registerDto);

      const result = await service.refreshToken(registerResult.refreshToken);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw error with invalid refresh token', async () => {
      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        'Invalid refresh token',
      );
    });
  });

  describe('validateUser', () => {
    it('should return user for valid credentials', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      await service.register(registerDto);

      const result = await service.validateUser(
        registerDto.email,
        registerDto.password,
      );

      expect(result).toBeDefined();
      expect(result?.email).toBe(registerDto.email);
    });

    it('should return null for invalid credentials', async () => {
      const result = await service.validateUser(
        'nonexistent@example.com',
        'password123',
      );

      expect(result).toBeNull();
    });
  });

  describe('generateTokens', () => {
    it('should generate tokens correctly', async () => {
      const userId = 'test-user-id';
      const email = 'test@example.com';
      const role = Role.USER;

      const tokens = await (service as any).generateTokens(userId, email, role);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
    });
  });
});
