import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";

/**
 * Prisma client singleton. A single instance is reused across hot-reloads in dev to
 * avoid exhausting the database connection pool.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: env.DATABASE_URL } },
    log: env.isProd ? ["error"] : ["error", "warn"],
  });

if (!env.isProd) {
  globalForPrisma.prisma = prisma;
}
