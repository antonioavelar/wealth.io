import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "@/entities/User";
import { Portfolio } from "@/entities/Portfolio";
import { Transaction } from "@/entities/Transaction";

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: process.env.TYPEORM_DATABASE || "./db.sqlite3",
  synchronize: process.env.NODE_ENV !== "production", // Use migrations in production
  logging: process.env.TYPEORM_LOGGING === "true",
  entities: [User, Portfolio, Transaction],
});

// Centralized initialization on system startup
if (!AppDataSource.isInitialized) {
  AppDataSource.initialize().catch((err) => {
    console.error("Failed to initialize TypeORM DataSource", err);
  });
}
