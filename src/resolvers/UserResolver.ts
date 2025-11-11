// src/resolvers/UserResolver.ts
import { Resolver, Query, Mutation, Args } from "type-graphql";
import { UserService } from "../service/user.service";
import { SignupArgs,UserResponseDto, LoginArgs, LoginResponseDto, RefreshTokenResponse, RefreshTokenArgs, sendPasswordResetEmailResponse, SendPasswordResetEmailArgs, GoogleSignupArgs } from "./dto/userResolverDto";
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

  @Mutation(() => LoginResponseDto)
  async login(@Args() { email, password }: LoginArgs): Promise<LoginResponseDto> {
    try {
      const result = await this.userService.login(email, password);

      return {
         idToken:result.idToken,
        refreshToken: result.refreshToken,
        uid: result.uid,
        email: result.email,
      };
    } catch (error: any) {
      logger.info("Login error:", error);
      throw new Error(error?.message || "Login failed");
    }
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
async verifyOtpForSignup(
  @Args() { email, otp }: VerifyOtpArgs
): Promise<VerifyOtpResponse> {
  // Find OTP record
  const type='signup_email_verification'
  const record = await UserOTP.findOne({ userId:email, otp, type });
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
async SendOtpForSignup(@Args() { email }: VerifyOtpArgs): Promise<VerifyOtpResponse> {
  try {
    await this.userService.resendEmailVerificationOtp(email);
    return { success: true, message: "OTP sent successfully" };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}


  @Mutation(() => RefreshTokenResponse)
  async refreshToken(@Args() { refreshToken }: RefreshTokenArgs): Promise<RefreshTokenResponse> {
    try {
      const result = await this.userService.refreshToken(refreshToken);
      return result;
    } catch (err: any) {
      logger.error("Refresh token failed:", err.message);
      throw new Error(err.message || "Failed to refresh token");
    }
  }

  @Mutation(() => sendPasswordResetEmailResponse)
  async sendPasswordResetEmail(@Args() { email }: SendPasswordResetEmailArgs): Promise<sendPasswordResetEmailResponse> {
    try {
     const message= await this.userService.generatePasswordResetLink(email);
      return {message};
    } catch (err: any) {
      console.error("Password reset error:", err);
      throw new Error(err.message || "Failed to send password reset email");
    }
  }

    @Mutation(() => UserResponseDto)
  async signupWithGoogle(
    @Args() args: GoogleSignupArgs
  ): Promise<UserResponseDto> {
    const user: User = await this.userService.signupWithGoogle(args);

    return {
      id: user.id,
      name: user.firstName, // or user.name if you store full name
      email: user.email,
    };
  }
}
