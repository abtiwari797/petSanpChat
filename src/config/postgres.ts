import { DataSource } from "typeorm";
import { User } from "../entities/User";

if (process.env.NODE_ENV !== "Dev") {
  require("dotenv").config();
}

const isNeon = !!process.env.DATABASE_URL; // Detect Neon usage

export const AppDataSource = new DataSource({
  type: "postgres",


  ...(isNeon
    ? {
        url: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false, // ✅ Required for Neon
        },
      }
    : {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5433,
        username: process.env.DB_USERNAME || "postgres",
        password: process.env.DB_PASSWORD || "Adarsh@1996",
        database: process.env.DB_NAME || "postgres",
      }),

  entities: [User],

  synchronize: true, // ✅ Turn OFF in prod & use migrations
  logging: true,
});
