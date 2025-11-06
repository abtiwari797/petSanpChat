// src/resolvers/UserResolver.ts
import { Resolver, Query, Mutation, Args } from "type-graphql";
import { UserService } from "../service/user.service";
import { SignupArgs,UserResponseDto } from "./dto/userResolverDto";
import { UserOTP } from "../model/userOtpSchema";
import { VerifyOtpArgs, VerifyOtpResponse } from "./dto/otpResolverDto";
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
  const record = await UserOTP.findOne({ email, otp, type });
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


}
