import { TestDatabase } from './test-database';

export default async function setup(): Promise<void> {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  process.env.JWT_EXPIRES_IN = '15m';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';

  // Setup test database
  await TestDatabase.setup();
}

export async function teardown(): Promise<void> {
  // Clean up test database
  await TestDatabase.teardown();
}
