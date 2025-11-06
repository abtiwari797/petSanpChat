// import { createClerkClient } from "@clerk/backend";

import dotenv from "dotenv";
dotenv.config();
import { clerkClient } from '@clerk/clerk-sdk-node';

// This is already connected to your account using the environment variable
export const clerk = clerkClient;