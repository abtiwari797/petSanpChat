// src/services/user.service.ts
import { getDBRepository } from "../db/repository";
import { User } from "../entities/User";
import { clerk } from "../config/clerk";
import { logger } from "../utils/logger";
import { SignupArgs } from "../resolvers/dto/userResolverDto";
import { sendOTPEmail } from "../utils/sentOtp";
import { UserOTP } from "../model/userOtpSchema";
import { v4 as uuidv4 } from "uuid";

export class UserService {
  private userRepo = getDBRepository(User);

async createUser(args: SignupArgs) {
  const {
    firstName,
    lastName,
    username,
    email,
    password,
    dob,
    phoneNumber,
  } = args;

  // ✅ Check if user exists
  const existing = await this.userRepo.findOne({
    where: [{ email }, { username }],
  });

  if (existing) throw new Error("User already exists");

  // ✅ Create in Clerk
  const clerkUser = await clerk.users.createUser({
    emailAddress: [email],
    firstName,
    lastName,
    username,
    password,
    publicMetadata: { dob, phoneNumber },
  });

  // Get the email ID from Clerk user
  const emailId = clerkUser.emailAddresses[0]?.id;
  if (!emailId) throw new Error("Email ID not found for the new user");

  // ✅ Send OTP email
  const otp = await sendOTPEmail(email); // returns the OTP string

  // ✅ Save OTP record in MongoDB
  const ttlMinutes = 10; // OTP expiration in minutes
  const expireAt = Date.now() + ttlMinutes * 60 * 1000; // UTC milliseconds

  const otpRecord = new UserOTP({
    userId: email,
    type: "signup_email_verification",
    otp,
    expireAt,
    createdAt: Date.now(),
  });

  await otpRecord.save();

  // Respond to client
  return clerkUser;
}

  async getUsers() {
    return await this.userRepo.find();
  }

  // Send password-reset OTP to a user's email (stores OTP in MongoDB)
  async sendPasswordReset(email: string) {
    // Ensure user exists in Postgres
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new Error("User not found");

    // Generate & send OTP via email
    const otp = await sendOTPEmail(email);

    // Save OTP record
    const ttlMinutes = 10;
    const expireAt = Date.now() + ttlMinutes * 60 * 1000;

    const otpRecord = new UserOTP({
      userId: email,
      type: "password_reset",
      otp,
      expireAt,
      createdAt: Date.now(),
    });

    await otpRecord.save();
    return { success: true };
  }

  // Verify OTP and update user's password in Clerk
  async resetPassword(email: string, otp: string, newPassword: string, type = "password_reset") {
    const record = await UserOTP.findOne({ userId: email, otp, type });
    if (!record) throw new Error("Invalid OTP");

    const now = Date.now();
    if (record.expireAt < now) {
      await UserOTP.deleteOne({ _id: record._id });
      throw new Error("OTP expired");
    }

    // Delete OTP record (single use)
    await UserOTP.deleteOne({ _id: record._id });

    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new Error("User not found");

    const clerkId = user.clerkId;

    // Update password in Clerk
    try {
      await clerk.users.updateUser(clerkId, { password: newPassword });
    } catch (err: any) {
      // Serialize error (include non-enumerable props) but DO NOT include password/otp
      const serialized: any = {};
      try {
        Object.getOwnPropertyNames(err).forEach((k) => {
          try {
            serialized[k] = (err as any)[k];
          } catch {
            serialized[k] = String((err as any)[k]);
          }
        });
      } catch {
        serialized.message = String(err);
      }
      logger.error("Clerk.updateUser failed (resetPassword)", {
        email,
        clerkId,
        clerkError: serialized,
      });
      throw err;
    }

    return { success: true };
  }

  // Change password for an authenticated user (by Clerk ID)
  async changePasswordForLoggedInUser(clerkId: string, newPassword: string) {
    if (!clerkId) throw new Error("Invalid user");

    // Update password in Clerk for the given clerkId
    try {
      await clerk.users.updateUser(clerkId, { password: newPassword });
    } catch (err: any) {
      const serialized: any = {};
      try {
        Object.getOwnPropertyNames(err).forEach((k) => {
          try {
            serialized[k] = (err as any)[k];
          } catch {
            serialized[k] = String((err as any)[k]);
          }
        });
      } catch {
        serialized.message = String(err);
      }
      logger.error("Clerk.updateUser failed (changePasswordForLoggedInUser)", {
        clerkId,
        clerkError: serialized,
      });
      throw err;
    }

    return { success: true };
  }
}
