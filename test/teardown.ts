import { TestDatabase } from './test-database';

export default async function teardown(): Promise<void> {
  await TestDatabase.teardown();
}
