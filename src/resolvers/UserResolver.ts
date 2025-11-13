// src/resolvers/UserResolver.ts
import { Resolver, Query, Mutation, Args } from "type-graphql";
import { UserService } from "../service/user.service";
import { SignupArgs,UserResponseDto, LoginArgs, LoginResponseDto, RefreshTokenResponse, RefreshTokenArgs, sendPasswordResetEmailResponse, SendPasswordResetEmailArgs, GoogleSignupArgs, CreateUserResponseDto, VerifyTokenArgs, VerifyTokenResponse } from "./dto/userResolverDto";
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
    logger.info(`📊 Query: getUsers`);
    try {
      return await this.userService.getUsers();
    } catch (error: any) {
      logger.error(`❌ getUsers error: ${error.message}`, error);
      throw error;
    }
  }

  @Mutation(() => LoginResponseDto)
  async login(@Args() { email, password }: LoginArgs): Promise<LoginResponseDto> {
    logger.info(`🔐 Mutation: login for email: ${email}`);
    try {
      const result = await this.userService.login(email, password);

      return {
        idToken: result.idToken,
        refreshToken: result.refreshToken,
        userId: result.uid,
        email: result.email,
      };
    } catch (error: any) {
      logger.error(`❌ Login mutation error for ${email}: ${error.message}`, error);
      throw new Error(error?.message || "Login failed");
    }
  }

@Mutation(() => CreateUserResponseDto)
async createUser(@Args() User: SignupArgs): Promise<CreateUserResponseDto> {
  logger.info(`📝 Mutation: createUser for email: ${User.email}`);
  try {
    await this.userService.createUser(User);
    return {success:true, message:'User created successfully'};
  } catch (error: any) {
    logger.info("Error creating user:", error);
    throw new Error(error?.message || "Internal Server Error");
  }
  }

@Mutation(() => VerifyOtpResponse)
  async verifyOtpForSignup(
  @Args() { email, otp }: VerifyOtpArgs
): Promise<VerifyOtpResponse> {
  logger.info(`🔍 Mutation: verifyOtpForSignup for email: ${email}`);
  try {
    // Find OTP record
    const type = 'signup_email_verification'
    logger.info(`📊 Looking up OTP record for: ${email}`);
    const record = await UserOTP.findOne({ userId: email, otp, type });
    if (!record) {
      logger.warn(`⚠️ Invalid OTP for: ${email}`);
      return { success: false, message: "Invalid OTP" };
    }

    // Check if expired
    const now = Date.now();
    if (record.expireAt < now) {
      logger.warn(`⚠️ OTP expired for: ${email}`);
      // Delete expired OTP
      await UserOTP.deleteOne({ _id: record._id });
      return { success: false, message: "OTP expired" };
    }

    // OTP is valid, delete record
    logger.info(`✅ OTP valid, deleting record`);
    await UserOTP.deleteOne({ _id: record._id });

    // ✅ Update user in PostgreSQL
    logger.info(`💾 Updating user verification status in PostgreSQL`);
    const user = await this.userRepo.findOne({ where: { email: email } });
    if (!user) {
      logger.error(`❌ User not found: ${email}`);
      return { success: false, message: "User not found" };
    }

    user.isVerified = true;
    await this.userRepo.save(user);
    logger.info(`✅ User email verified: ${email}`);

    return { success: true, message: "OTP verified successfully" };
  } catch (error: any) {
    logger.error(`❌ verifyOtpForSignup error for ${email}: ${error.message}`, error);
    throw error;
  }
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

  @Query(() => VerifyTokenResponse)
  async verifyToken(@Args() { idToken }: VerifyTokenArgs): Promise<VerifyTokenResponse> {
    logger.info(`🔍 Query: verifyToken`);
    try {
      const result = await this.userService.verifyToken(idToken);
      return { uid: result.uid, email: result.email };
    } catch (err: any) {
      logger.error(`❌ verifyToken failed: ${err.message}`, err);
      throw new Error(err.message || "Token verification failed");
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
