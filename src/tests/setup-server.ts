// Integration tests use the separate crm_test database, never the dev one.
const testDatabaseUrl = process.env.TEST_DATABASE_URL
if (!testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL is not set. Copy .env.example to .env.')
}
process.env.DATABASE_URL = testDatabaseUrl
