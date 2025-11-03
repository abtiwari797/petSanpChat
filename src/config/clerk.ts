import { Clerk } from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";
dotenv.config();

export const clerk = Clerk({
  secretKey:process.env.CLERK_SECRET_KEY,
});