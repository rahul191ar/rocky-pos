import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from '../../src/categories/categories.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TestDatabase } from '../test-database';

describe('CategoriesService', () => {
  let service: CategoriesService;
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
        CategoriesService,
        {
          provide: PrismaService,
          useValue: TestDatabase.getPrisma(),
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    prisma = module.get<PrismaService>(PrismaService);

    // Clear database before each test
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a category', async () => {
      const createCategoryDto = {
        name: 'Electronics',
        description: 'Electronic devices and gadgets',
      };

      const result = await service.create(createCategoryDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(createCategoryDto.name);
      expect(result.description).toBe(createCategoryDto.description);
      expect(result.isActive).toBe(true);

      // Verify category exists in database
      const categoryInDb = await prisma.category.findUnique({
        where: { name: createCategoryDto.name },
      });
      expect(categoryInDb).toBeDefined();
    });

    it('should throw error if category name already exists', async () => {
      const createCategoryDto = {
        name: 'Electronics',
        description: 'Electronic devices',
      };

      // Create category first
      await service.create(createCategoryDto);

      // Try to create again
      await expect(service.create(createCategoryDto)).rejects.toThrow(
        'Category with this name already exists',
      );
    });

    it('should create category without description', async () => {
      const createCategoryDto = {
        name: 'Books',
      };

      const result = await service.create(createCategoryDto);

      expect(result.name).toBe('Books');
      expect(result.description).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all active categories', async () => {
      // Create categories
      const category1 = await service.create({
        name: 'Electronics',
        description: 'Electronic items',
      });

      const category2 = await service.create({
        name: 'Clothing',
        description: 'Fashion items',
      });

      // Create inactive category
      await prisma.category.create({
        data: {
          name: 'Inactive Category',
          description: 'Inactive items',
          isActive: false,
        },
      });

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result.map(c => c.name)).toEqual(
        expect.arrayContaining(['Electronics', 'Clothing'])
      );
    });

    it('should return empty array if no categories exist', async () => {
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return category by id', async () => {
      const createCategoryDto = {
        name: 'Electronics',
        description: 'Electronic devices',
      };

      const createdCategory = await service.create(createCategoryDto);

      const result = await service.findOne(createdCategory.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(createdCategory.id);
      expect(result.name).toBe(createCategoryDto.name);
    });

    it('should throw error if category not found', async () => {
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'Category with ID non-existent-id not found',
      );
    });
  });

  describe('findByName', () => {
    it('should return category by name', async () => {
      const createCategoryDto = {
        name: 'Electronics',
        description: 'Electronic devices',
      };

      const createdCategory = await service.create(createCategoryDto);

      const result = await service.findByName('Electronics');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Electronics');
    });

    it('should return null if category not found', async () => {
      const result = await service.findByName('NonExistent');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should successfully update category', async () => {
      const createCategoryDto = {
        name: 'Electronics',
        description: 'Electronic devices',
      };

      const createdCategory = await service.create(createCategoryDto);

      const updateCategoryDto = {
        name: 'Electronics & Gadgets',
        description: 'Updated description',
      };

      const result = await service.update(createdCategory.id, updateCategoryDto);

      expect(result.name).toBe(updateCategoryDto.name);
      expect(result.description).toBe(updateCategoryDto.description);
    });

    it('should throw error if category not found', async () => {
      const updateCategoryDto = {
        name: 'Updated Category',
      };

      await expect(service.update('non-existent-id', updateCategoryDto)).rejects.toThrow(
        'Category with ID non-existent-id not found',
      );
    });

    it('should throw error if name already exists when updating', async () => {
      const category1 = await service.create({
        name: 'Electronics',
        description: 'Electronic items',
      });

      const category2 = await service.create({
        name: 'Clothing',
        description: 'Fashion items',
      });

      await expect(service.update(category2.id, { name: 'Electronics' })).rejects.toThrow(
        'Category with this name already exists',
      );
    });
  });

  describe('remove', () => {
    it('should successfully delete category without products', async () => {
      const createCategoryDto = {
        name: 'Electronics',
        description: 'Electronic devices',
      };

      const createdCategory = await service.create(createCategoryDto);

      const result = await service.remove(createdCategory.id);

      expect(result.id).toBe(createdCategory.id);

      // Verify category is deleted from database
      const categoryInDb = await prisma.category.findUnique({
        where: { id: createdCategory.id },
      });
      expect(categoryInDb).toBeNull();
    });

    it('should throw error if category has products', async () => {
      const category = await service.create({
        name: 'Electronics',
        description: 'Electronic items',
      });

      // Create product in category
      await prisma.product.create({
        data: {
          name: 'Test Product',
          sku: 'TEST-001',
          price: 100.00,
          categoryId: category.id,
        },
      });

      await expect(service.remove(category.id)).rejects.toThrow(
        'Cannot delete category that has products',
      );
    });

    it('should throw error if category not found', async () => {
      await expect(service.remove('non-existent-id')).rejects.toThrow(
        'Category with ID non-existent-id not found',
      );
    });
  });

  describe('toggleCategoryStatus', () => {
    it('should toggle category active status', async () => {
      const createCategoryDto = {
        name: 'Electronics',
        description: 'Electronic devices',
        isActive: true,
      };

      const createdCategory = await service.create(createCategoryDto);

      // Initially active
      expect(createdCategory.isActive).toBe(true);

      // Toggle to inactive
      const result1 = await service.toggleCategoryStatus(createdCategory.id);
      expect(result1.isActive).toBe(false);

      // Toggle back to active
      const result2 = await service.toggleCategoryStatus(createdCategory.id);
      expect(result2.isActive).toBe(true);
    });

    it('should throw error if category not found', async () => {
      await expect(service.toggleCategoryStatus('non-existent-id')).rejects.toThrow(
        'Category with ID non-existent-id not found',
      );
    });
  });
});
