// src/services/user.service.ts
import { getDBRepository } from "../db/repository";
import { User } from "../entities/User";
import { clerk } from "../config/clerk";
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
}
