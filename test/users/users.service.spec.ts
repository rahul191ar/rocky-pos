import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../../src/users/users.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TestDatabase } from '../test-database';
import { Role } from '@prisma/client';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  beforeAll(async () => {
    await TestDatabase.setup();
  });

  afterAll(async () => {
    await TestDatabase.teardown();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: TestDatabase.getPrisma(),
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);

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

  describe('create', () => {
    it('should successfully create a new user', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: Role.ADMIN,
      };

      const result = await service.create(createUserDto);

      expect(result).toBeDefined();
      expect(result.email).toBe(createUserDto.email);
      expect(result.firstName).toBe(createUserDto.firstName);
      expect(result.lastName).toBe(createUserDto.lastName);
      expect(result.role).toBe(createUserDto.role);
      expect(result.isActive).toBe(true);

      // Verify user exists in database
      const userInDb = await prisma.user.findUnique({
        where: { email: createUserDto.email },
      });
      expect(userInDb).toBeDefined();
    });

    it('should throw error if user already exists', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      // Create user first
      await service.create(createUserDto);

      // Try to create again
      await expect(service.create(createUserDto)).rejects.toThrow(
        'User with this email already exists',
      );
    });

    it('should default to USER role if not specified', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = await service.create(createUserDto);

      expect(result.role).toBe(Role.USER);
    });
  });

  describe('findAll', () => {
    it('should return all active users', async () => {
      // Create test users
      const user1 = await service.create({
        email: 'user1@example.com',
        password: 'password123',
        firstName: 'User',
        lastName: 'One',
      });

      const user2 = await service.create({
        email: 'user2@example.com',
        password: 'password123',
        firstName: 'User',
        lastName: 'Two',
      });

      // Create inactive user
      await prisma.user.create({
        data: {
          email: 'inactive@example.com',
          password: 'hashedpassword',
          firstName: 'Inactive',
          lastName: 'User',
          isActive: false,
        },
      });

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result.map(u => u.email)).toEqual(
        expect.arrayContaining(['user1@example.com', 'user2@example.com'])
      );
    });

    it('should return empty array if no users exist', async () => {
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const createdUser = await service.create(createUserDto);

      const result = await service.findOne(createdUser.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(createdUser.id);
      expect(result.email).toBe(createUserDto.email);
    });

    it('should throw error if user not found', async () => {
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'User with ID non-existent-id not found',
      );
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const createdUser = await service.create(createUserDto);

      const result = await service.findByEmail(createUserDto.email);

      expect(result).toBeDefined();
      expect(result?.email).toBe(createUserDto.email);
    });

    it('should return null if user not found', async () => {
      const result = await service.findByEmail('nonexistent@example.com');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should successfully update user', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const createdUser = await service.create(createUserDto);

      const updateUserDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        role: Role.ADMIN,
      };

      const result = await service.update(createdUser.id, updateUserDto);

      expect(result.firstName).toBe(updateUserDto.firstName);
      expect(result.lastName).toBe(updateUserDto.lastName);
      expect(result.role).toBe(updateUserDto.role);
      expect(result.email).toBe(createUserDto.email); // Should not change
    });

    it('should throw error if user not found', async () => {
      const updateUserDto = {
        firstName: 'Jane',
      };

      await expect(service.update('non-existent-id', updateUserDto)).rejects.toThrow(
        'User with ID non-existent-id not found',
      );
    });
  });

  describe('remove', () => {
    it('should successfully delete user', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const createdUser = await service.create(createUserDto);

      const result = await service.remove(createdUser.id);

      expect(result.id).toBe(createdUser.id);

      // Verify user is deleted from database
      const userInDb = await prisma.user.findUnique({
        where: { id: createdUser.id },
      });
      expect(userInDb).toBeNull();
    });

    it('should throw error if user not found', async () => {
      await expect(service.remove('non-existent-id')).rejects.toThrow(
        'User with ID non-existent-id not found',
      );
    });
  });

  describe('toggleUserStatus', () => {
    it('should toggle user active status', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const createdUser = await service.create(createUserDto);

      // Initially active
      expect(createdUser.isActive).toBe(true);

      // Toggle to inactive
      const result1 = await service.toggleUserStatus(createdUser.id);
      expect(result1.isActive).toBe(false);

      // Toggle back to active
      const result2 = await service.toggleUserStatus(createdUser.id);
      expect(result2.isActive).toBe(true);
    });

    it('should throw error if user not found', async () => {
      await expect(service.toggleUserStatus('non-existent-id')).rejects.toThrow(
        'User with ID non-existent-id not found',
      );
    });
  });
});
