import { execSync } from 'child_process';
import { Client } from 'pg';
import { PrismaClient } from '@prisma/client';

const TEST_DB_NAME = 'test_rocky_pos';

export class TestDatabase {
  private static prisma: PrismaClient | null = null;

  static async setup(): Promise<void> {
    // Create test database
    await this.createTestDatabase();

    // Create Prisma client with test database URL
    const testDbUrl = `postgresql://postgres:postgres@localhost:5432/${TEST_DB_NAME}?schema=public`;
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: testDbUrl,
        },
      },
    });

    // Connect to database
    await this.prisma.$connect();

    // Run migrations
    await this.runMigrations();
  }

  static async teardown(): Promise<void> {
    if (this.prisma) {
      // Close Prisma connection
      await this.prisma.$disconnect();
      this.prisma = null;
    }

    // Drop test database
    await this.dropTestDatabase();
  }

  static getPrisma(): PrismaClient {
    if (!this.prisma) {
      throw new Error('Test database not initialized. Call setup() first.');
    }
    return this.prisma;
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
      // Generate Prisma client
      execSync('npx prisma generate', {
        cwd: process.cwd(),
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: `postgresql://postgres:postgres@localhost:5432/${TEST_DB_NAME}?schema=public` }
      });

      // Run migrations
      execSync('npx prisma migrate deploy', {
        cwd: process.cwd(),
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: `postgresql://postgres:postgres@localhost:5432/${TEST_DB_NAME}?schema=public` }
      });

      console.log('✅ Ran database migrations');
    } catch (error) {
      console.error('❌ Failed to run migrations:', error);
      throw error;
    }
  }
}
