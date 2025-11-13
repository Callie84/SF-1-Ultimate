// Jest Setup für Auth Service
import { config } from 'dotenv';

// Lade Test-Environment Variablen
config({ path: '.env.test' });

// Setup Timeouts
jest.setTimeout(10000);

// Mock Redis Client
jest.mock('./src/config/redis', () => ({
  connectRedis: jest.fn().mockResolvedValue(undefined),
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    expire: jest.fn()
  }
}));

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    $connect: jest.fn(),
    $disconnect: jest.fn()
  }))
}));
