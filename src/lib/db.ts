import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient(): PrismaClient {
  // During build time or when no DB is configured, use base PrismaClient
  // It will throw on actual queries but allows the app to build
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.warn('DATABASE_URL not set - database features will not work');
    // Return a stub that will fail gracefully at runtime
    return new PrismaClient();
  }

  // Use adapter for database connection
  try {
    const { PrismaPg } = require('@prisma/adapter-pg');
    const adapter = new PrismaPg({ connectionString });
    return new PrismaClient({ adapter });
  } catch {
    // Fallback for build time when adapter isn't available
    return new PrismaClient();
  }
}

// Lazy initialization to prevent issues during build
let _prisma: PrismaClient | undefined;

export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) {
      _prisma = globalForPrisma.prisma || createPrismaClient();
      if (process.env.NODE_ENV !== 'production') {
        globalForPrisma.prisma = _prisma;
      }
    }
    return (_prisma as unknown as Record<string | symbol, unknown>)[prop];
  },
});
