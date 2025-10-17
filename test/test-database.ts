import { execSync } from 'child_process';
import { Client } from 'pg';
import { PrismaClient } from '@prisma/client';

const TEST_DB_NAME = 'test_rocky_pos';

export class TestDatabase {
  private static prisma: PrismaClient | null = null;
  private static isSetup = false;

  static async setup(): Promise<void> {
    if (this.isSetup) {
      return;
    }

    // Create test database
    await this.createTestDatabase();

    // Create Prisma client with test database URL
    const testDbUrl = `postgresql://postgres:postgres@localhost:5432/${TEST_DB_NAME}?schema=public`;
    process.env.DATABASE_URL = testDbUrl;

    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: testDbUrl,
        },
      },
      log: ['error'], // Only log errors during tests
    });

    // Connect to database
    await this.prisma.$connect();

    // Run migrations
    await this.runMigrations();

    this.isSetup = true;
  }

  static async teardown(): Promise<void> {
    if (this.prisma) {
      // Close Prisma connection
      await this.prisma.$disconnect();
      this.prisma = null;
    }

    // Drop test database
    await this.dropTestDatabase();
    
    this.isSetup = false;
  }

  static getPrisma(): PrismaClient {
    if (!this.prisma) {
      throw new Error('Test database not initialized. Call setup() first.');
    }
    return this.prisma;
  }

  // Clean all tables but keep the connection alive
  static async cleanDatabase(): Promise<void> {
    if (!this.prisma) {
      throw new Error('Test database not initialized.');
    }

    try {
      // Delete in correct order to respect foreign key constraints
      await this.prisma.saleItem.deleteMany();
      await this.prisma.sale.deleteMany();
      await this.prisma.purchaseItem.deleteMany();
      await this.prisma.purchase.deleteMany();
      await this.prisma.product.deleteMany();
      await this.prisma.category.deleteMany();
      await this.prisma.customer.deleteMany();
      await this.prisma.supplier.deleteMany();
      await this.prisma.user.deleteMany();
    } catch (error) {
      console.error('Failed to clean database:', error);
      throw error;
    }
  }

  private static async createTestDatabase(): Promise<void> {
    const client = new Client({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'postgres',
      database: 'postgres',
    });

    try {
      await client.connect();

      // Check if test database exists
      const result = await client.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [TEST_DB_NAME]
      );

      if (result.rows.length === 0) {
        // Create test database
        await client.query(`CREATE DATABASE ${TEST_DB_NAME}`);
        console.log(`✅ Created test database: ${TEST_DB_NAME}`);
      } else {
        console.log(`✅ Test database already exists: ${TEST_DB_NAME}`);
      }
    } catch (error) {
      console.error('❌ Failed to create test database:', error);
      throw error;
    } finally {
      await client.end();
    }
  }

  private static async dropTestDatabase(): Promise<void> {
    const client = new Client({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'postgres',
      database: 'postgres',
    });

    try {
      await client.connect();

      // Terminate existing connections to test database
      await client.query(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = $1 AND pid <> pg_backend_pid()
      `, [TEST_DB_NAME]);

      // Drop test database
      await client.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
      console.log(`✅ Dropped test database: ${TEST_DB_NAME}`);
    } catch (error) {
      console.error('❌ Failed to drop test database:', error);
    } finally {
      await client.end();
    }
  }

  private static async runMigrations(): Promise<void> {
    try {
      // Just run migrations (Prisma generate already done during npm install)
      execSync('npx prisma migrate deploy', {
        cwd: process.cwd(),
        stdio: 'pipe',
        env: { 
          ...process.env, 
          DATABASE_URL: `postgresql://postgres:postgres@localhost:5432/${TEST_DB_NAME}?schema=public` 
        }
      });

      console.log('✅ Ran database migrations');
    } catch (error) {
      console.error('❌ Failed to run migrations:', error);
      throw error;
    }
  }
}
