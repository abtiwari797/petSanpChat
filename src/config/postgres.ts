import { DataSource } from "typeorm";
import { User } from "../entities/User";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5433,
  username: "postgres",
  password: "Adarsh@1996",
  database: "postgres",
  synchronize: true, // ✅ Auto create tables in DEV only!
  logging: true,
  entities: [User],
});