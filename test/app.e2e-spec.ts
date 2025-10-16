import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestDatabase } from '../test-database';
import { Role } from '@prisma/client';

describe('Rocky POS API (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    await TestDatabase.setup();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await TestDatabase.teardown();
  });

  beforeEach(async () => {
    // Clear all data before each test
    const prisma = TestDatabase.getPrisma();
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

    // Create and login a test user
    const registerResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      });

    accessToken = registerResponse.body.accessToken;
  });

  describe('Authentication', () => {
    it('/api/auth/register (POST) - should register a new user', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          firstName: 'New',
          lastName: 'User',
        })
        .expect(201)
        .expect((res: any) => {
          expect(res.body.user.email).toBe('newuser@example.com');
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
        });
    });

    it('/api/auth/login (POST) - should login successfully', async () => {
      // Register a user first
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'login@example.com',
          password: 'password123',
          firstName: 'Login',
          lastName: 'User',
        });

      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123',
        })
        .expect(201)
        .expect((res: any) => {
          expect(res.body.user.email).toBe('login@example.com');
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
        });
    });

    it('/api/auth/profile (GET) - should return user profile', () => {
      return request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.userId).toBeDefined();
          expect(res.body.email).toBe('test@example.com');
        });
    });

    it('/api/auth/login (POST) - should fail with wrong credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('Categories', () => {
    it('/api/categories (POST) - should create a category', () => {
      return request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Electronics',
          description: 'Electronic devices',
        })
        .expect(201)
        .expect((res: any) => {
          expect(res.body.name).toBe('Electronics');
          expect(res.body.description).toBe('Electronic devices');
        });
    });

    it('/api/categories (GET) - should return all categories', async () => {
      // Create a category first
      await request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Electronics',
        });

      return request(app.getHttpServer())
        .get('/api/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('/api/categories/:id (GET) - should return category by id', async () => {
      // Create a category first
      const createResponse = await request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Electronics',
        });

      const categoryId = createResponse.body.id;

      return request(app.getHttpServer())
        .get(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.id).toBe(categoryId);
          expect(res.body.name).toBe('Electronics');
        });
    });
  });

  describe('Products', () => {
    let categoryId: string;

    beforeEach(async () => {
      // Create a category for products
      const categoryResponse = await request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Electronics',
        });

      categoryId = categoryResponse.body.id;
    });

    it('/api/products (POST) - should create a product', () => {
      return request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'iPhone 14',
          sku: 'IPH14-128',
          price: 999.99,
          categoryId: categoryId,
        })
        .expect(201)
        .expect((res: any) => {
          expect(res.body.name).toBe('iPhone 14');
          expect(res.body.sku).toBe('IPH14-128');
          expect(res.body.price).toBe(999.99);
        });
    });

    it('/api/products (GET) - should return all products', async () => {
      // Create a product first
      await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'iPhone 14',
          sku: 'IPH14-128',
          price: 999.99,
          categoryId: categoryId,
        });

      return request(app.getHttpServer())
        .get('/api/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('/api/products/low-stock (GET) - should return low stock products', async () => {
      // Create a product with low stock
      await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Low Stock Product',
          sku: 'LOW-001',
          price: 100.00,
          quantity: 2,
          minQuantity: 5,
          categoryId: categoryId,
        });

      return request(app.getHttpServer())
        .get('/api/products/low-stock')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });
  });

  describe('Sales', () => {
    let categoryId: string;
    let productId: string;

    beforeEach(async () => {
      // Create a category and product for sales
      const categoryResponse = await request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Electronics',
        });

      categoryId = categoryResponse.body.id;

      const productResponse = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'iPhone 14',
          sku: 'IPH14-128',
          price: 999.99,
          quantity: 10,
          categoryId: categoryId,
        });

      productId = productResponse.body.id;
    });

    it('/api/sales (POST) - should create a sale', () => {
      return request(app.getHttpServer())
        .post('/api/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          items: [
            {
              productId: productId,
              quantity: 2,
            },
          ],
          paymentMethod: 'CASH',
          taxAmount: 100.00,
        })
        .expect(201)
        .expect((res: any) => {
          expect(res.body.totalAmount).toBe(1999.98);
          expect(res.body.finalAmount).toBe(2099.98);
          expect(res.body.paymentMethod).toBe('CASH');
          expect(res.body.status).toBe('COMPLETED');
          expect(res.body.items).toHaveLength(1);
        });
    });

    it('/api/sales (GET) - should return all sales', async () => {
      // Create a sale first
      await request(app.getHttpServer())
        .post('/api/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          items: [
            {
              productId: productId,
              quantity: 1,
            },
          ],
          paymentMethod: 'CASH',
        });

      return request(app.getHttpServer())
        .get('/api/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('/api/sales/report (GET) - should return sales report', async () => {
      // Create a sale first
      await request(app.getHttpServer())
        .post('/api/sales')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          items: [
            {
              productId: productId,
              quantity: 1,
            },
          ],
          paymentMethod: 'CASH',
          taxAmount: 50.00,
        });

      return request(app.getHttpServer())
        .get('/api/sales/report')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.totalSales).toBe(1);
          expect(res.body.totalRevenue).toBe(999.99);
          expect(res.body.totalTax).toBe(50.00);
          expect(res.body.paymentMethodStats.CASH).toBe(1);
        });
    });
  });

  describe('Dashboard', () => {
    it('/api/dashboard/stats (GET) - should return dashboard statistics', () => {
      return request(app.getHttpServer())
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.totalSales).toBeDefined();
          expect(res.body.totalProducts).toBeDefined();
          expect(res.body.totalCustomers).toBeDefined();
          expect(res.body.totalRevenue).toBeDefined();
          expect(res.body.lowStockProducts).toBeDefined();
        });
    });
  });

  describe('Error Handling', () => {
    it('should return 401 for unauthorized requests', () => {
      return request(app.getHttpServer())
        .get('/api/categories')
        .expect(401);
    });

    it('should return 404 for non-existent endpoints', () => {
      return request(app.getHttpServer())
        .get('/api/non-existent')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should validate request data', () => {
      return request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          // Missing required 'name' field
          description: 'Invalid category',
        })
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting', async () => {
      // Make multiple requests quickly
      const requests = Array(5).fill(null).map(() =>
        request(app.getHttpServer())
          .get('/api/categories')
          .set('Authorization', `Bearer ${accessToken}`)
      );

      const responses = await Promise.all(requests);

      // At least one should be rate limited (429)
      const hasRateLimit = responses.some((res: any) => res.status === 429);
      expect(hasRateLimit).toBe(true);
    });
  });
});
