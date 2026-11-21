// Runs before the suite: point Prisma at an isolated test database and push the schema.
import { execSync } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';
import path from 'node:path';

process.env.DATABASE_URL = 'file:./test.db';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-secret-test-secret-test-secret-1234';

const dbPath = path.join(__dirname, '..', 'prisma', 'test.db');
if (existsSync(dbPath)) rmSync(dbPath);

execSync('npx prisma db push --skip-generate', {
  stdio: 'ignore',
  env: { ...process.env, DATABASE_URL: 'file:./test.db' },
});
