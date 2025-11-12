import { DataSource } from "typeorm";
import { User } from "../entities/User";
import dotenv from "dotenv";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL, // Use Neon connection string directly
  ssl: {
    rejectUnauthorized: false, // Required for Neon (managed SSL)
  },
  entities: [User],
  synchronize: true, // Turn OFF in prod if you use migrations
  logging: true,
});
