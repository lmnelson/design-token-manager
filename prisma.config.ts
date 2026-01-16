// Load .env.local first, then .env (for local development)
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import path from 'node:path';
import { defineConfig } from 'prisma/config';

// Use unpooled connection for migrations, fall back to pooled for runtime
const databaseUrl = process.env.DATABASE_URL_UNPOOLED
  || process.env.POSTGRES_URL_NON_POOLING
  || process.env.DATABASE_URL
  || '';

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),

  datasource: {
    url: databaseUrl,
  },
});
