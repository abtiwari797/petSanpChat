// src/resolvers/UserResolver.ts
import { Resolver, Query, Mutation, Args } from "type-graphql";
import { UserService } from "../service/user.service";
import { SignupArgs,UserResponseDto } from "./dto/userResolverDto";
import { UserOTP } from "../model/userOtpSchema";
import {
  VerifyOtpArgs,
  VerifyOtpResponse,
  ForgotPasswordArgs,
  ResetPasswordArgs,
  ChangePasswordArgs,
} from "./dto/otpResolverDto";
import { Ctx } from "type-graphql";
import { getDBRepository } from "../db/repository";
import { User } from "../entities/User";
import { logger } from "../utils/logger";


@Resolver()
export class UserResolver {
  private userService = new UserService();
  private userRepo = getDBRepository(User);
  @Query(() => [UserResponseDto])
  async getUsers(): Promise<UserResponseDto[]> {
    return await this.userService.getUsers();
  }

@Mutation(() => UserResponseDto)
async createUser(@Args() User: SignupArgs): Promise<any> {
  try {
    const data = await this.userService.createUser(User);
    return data;
  } catch (error: any) {
    logger.info("Error creating user:", error);
    throw new Error(error?.message || "Internal Server Error");
  }
  }

@Mutation(() => VerifyOtpResponse)
async verifyOtp(
  @Args() { email, otp, type }: VerifyOtpArgs
): Promise<VerifyOtpResponse> {
  // Find OTP record
  const record = await UserOTP.findOne({ userId: email, otp, type });
  if (!record) {
    return { success: false, message: "Invalid OTP" };
  }

  // Check if expired
  const now = Date.now();
  if (record.expireAt < now) {
    // Delete expired OTP
    await UserOTP.deleteOne({ _id: record._id });
    return { success: false, message: "OTP expired" };
  }

  // OTP is valid, delete record
  await UserOTP.deleteOne({ _id: record._id });

  // ✅ Update user in PostgreSQL
  const user = await this.userRepo.findOne({ where: { email: email } });
  if (!user) {
    return { success: false, message: "User not found" };
  }

  user.isVerified = true;
  await this.userRepo.save(user);

  return { success: true, message: "OTP verified successfully" };
}

@Mutation(() => VerifyOtpResponse)
async forgotPassword(
  @Args() { email }: ForgotPasswordArgs
): Promise<VerifyOtpResponse> {
  try {
    await this.userService.sendPasswordReset(email);
    return { success: true, message: "Password reset OTP sent" };
  } catch (error: any) {
    logger.error("Error sending password reset OTP:", error);
    return { success: false, message: error?.message || "Internal Server Error" };
  }
}

@Mutation(() => VerifyOtpResponse)
async resetPassword(
  @Args() { email, otp, newPassword, type }: ResetPasswordArgs
): Promise<VerifyOtpResponse> {
  try {
    await this.userService.resetPassword(email, otp, newPassword, type || "password_reset");
    return { success: true, message: "Password reset successful" };
  } catch (error: any) {
    logger.error("Error resetting password:", error);
    return { success: false, message: error?.message || "Internal Server Error" };
  }
}

@Mutation(() => VerifyOtpResponse)
async changePassword(
  @Args() { currentPassword, newPassword }: ChangePasswordArgs,
  @Ctx() ctx: any
): Promise<VerifyOtpResponse> {
  // This mutation is for authenticated users (inside login).
  // We rely on the `session` injected into GraphQL context by `src/index.ts` auth middleware.
  const session = ctx?.session;
  if (!session) {
    return { success: false, message: "Not authenticated" };
  }

  // Attempt to extract clerkId from session. Clerk session object usually includes `userId`.
  const clerkId = session.userId || session.user_id || session.userId?.toString();
  if (!clerkId) {
    return { success: false, message: "Unable to resolve user from session" };
  }

  try {
    // Note: we rely on Clerk SDK allowing admin-side password update for the authenticated user.
    await this.userService.changePasswordForLoggedInUser(clerkId, newPassword);
    return { success: true, message: "Password changed successfully" };
  } catch (err: any) {
    logger.error("Error changing password:", err);
    return { success: false, message: err?.message || "Internal Server Error" };
  }
}


}
