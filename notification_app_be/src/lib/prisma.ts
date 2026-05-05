import { PrismaClient } from "@prisma/client";
import { Log } from "../../logging_middleware/src";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Log DB connection
prisma
  .$connect()
  .then(() => {
    Log("backend", "info", "config", "PostgreSQL database connected successfully via Prisma");
  })
  .catch((err: Error) => {
    Log("backend", "fatal", "config", `Database connection failed: ${err.message}`);
  });

export default prisma;
