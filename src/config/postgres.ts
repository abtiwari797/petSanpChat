import { DataSource } from "typeorm";
import { User } from "../entities/User";
import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const useNeon = !!process.env.DATABASE_URL; // ✅ true if Railway/Neon connection is used

export const AppDataSource = new DataSource({
  type: "postgres",

  ...(useNeon
    ? {
        // ✅ Railway or Neon cloud DB
        url: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false, // Required for Neon/Railway SSL
        },
      }
    : {
        // ✅ Local development fallback
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        username: process.env.DB_USERNAME || "postgres",
        password: process.env.DB_PASSWORD || "Adarsh@1996",
        database: process.env.DB_NAME || "postgres",
      }),

  entities: [User],
  synchronize: true, // ❗ Turn off in production if you use migrations
  logging: !isProduction, // less noisy logs in production
});
