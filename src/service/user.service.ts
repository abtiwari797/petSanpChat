import { getDBRepository } from "../db/repository";
import { User } from "../entities/User";
import { GoogleSignupArgs, SignupArgs, UpdateProfileInput, UserResponseDto } from "../resolvers/dto/userResolverDto";
import { sendOTPEmail } from "../utils/sentOtp";
import { UserOTP } from "../model/userOtpSchema";
import admin from "../config/firebase";
import axios from "axios";
import dotenv from "dotenv";
import { sendEmail } from "../utils/emailService";
import { OAuth2Client } from "google-auth-library";
import { UserOTPRepository } from "../repository/UserOTPRepository";
import { logger } from "../utils/logger";
import { HttpStatusCodes } from "../utils/constant";
import { TemplateService } from "../utils/templateService";

dotenv.config();

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY!;
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

interface ServiceError extends Error {
  status?: number;
}

export class UserService {
  private userRepo = getDBRepository(User);
  private userOTPRepo = new UserOTPRepository();

  private createError(message: string, status = HttpStatusCodes.INTERNAL_SERVER_ERROR): ServiceError {
    const error = new Error(message) as ServiceError;
    error.status = status;
    return error;
  }

  async createUser(args: SignupArgs) {
    const { firstName, lastName, username, email, password, dob, phoneNumber } = args;

    logger.info(`🔄 Starting user signup for email: ${email}`);

    try {
      const existing = await this.userRepo.findOne({ where: [{ email }, { username }] });
      if (existing) {
        logger.warn(`⚠️ User already exists: ${email}`);
        throw this.createError("User already exists", HttpStatusCodes.CONFLICT); // 409
      }

      const userRecord = await admin.auth().createUser({ email, password, displayName: `${firstName} ${lastName}` });
      logger.info(`✅ Firebase user created with UID: ${userRecord.uid}`);

      const verificationLink = await admin.auth().generateEmailVerificationLink(email);
      logger.info(`✅ Verification link generated`);

      const otp = await sendOTPEmail(email);
      logger.info(`✅ OTP sent successfully`);

      const ttlMinutes = 10;
      const expireAt = Date.now() + ttlMinutes * 60 * 1000;

      await UserOTP.create({ userId: email, type: "signup_email_verification", otp, expireAt, createdAt: Date.now() });
      logger.info(`✅ OTP record saved successfully`);

      const user = this.userRepo.create({
        firebaseId: userRecord.uid,
        firstName,
        lastName,
        username,
        email,
        dob,
        phoneNumber,
        isVerified: false,
      });
      await this.userRepo.save(user);
      logger.info(`✅ User saved to PostgreSQL successfully`);

      return { user, verificationLink };
    } catch (error: any) {
      logger.error(`❌ Signup error for ${email}: ${error.message}`, error);
      throw this.createError(error.message, error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async login(email: string, password: string) {
    logger.info(`🔄 Login attempt for email: ${email}`);

    try {
      const user = await this.userRepo.findOne({ where: { email } });
      if (!user) throw this.createError("User not found. Please sign up first.", HttpStatusCodes.NOT_FOUND); // 404

      if (!user.isVerified) throw this.createError("Email is not verified. Please verify your email first.", HttpStatusCodes.FORBIDDEN); // 403

      const response = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
        { email, password, returnSecureToken: true }
      );

      return {
        idToken: response.data.idToken,
        refreshToken: response.data.refreshToken,
        uid: response.data.localId,
        email: response.data.email,
      };
    } catch (error: any) {
      logger.error(`❌ Login error for ${email}: ${error.message}`, error);

      const firebaseMsg = error.response?.data?.error?.message;
      if (firebaseMsg) throw this.createError(firebaseMsg, HttpStatusCodes.BAD_REQUEST);

      throw this.createError(error.message, error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async verifyToken(idToken: string) {
    logger.info(`🔍 Verifying ID token`);
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      return { uid: decodedToken.uid, email: decodedToken.email! };
    } catch (error: any) {
      logger.error(`❌ Token verification failed: ${error.message}`, error);
      throw this.createError(error.message, HttpStatusCodes.UNAUTHORIZED); // 401
    }
  }

  async refreshToken(refreshToken: string) {
    logger.info(`🔄 Refreshing Firebase token`);
    try {
      const url = `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`;
      const response = await axios.post(url, { grant_type: "refresh_token", refresh_token: refreshToken });
      return { idToken: response.data.id_token, refreshToken: response.data.refresh_token, uid: response.data.user_id, email: "" };
    } catch (err: any) {
      logger.error(`❌ Token refresh failed: ${err.message}`, err);
      throw this.createError(err.response?.data?.error?.message || "Failed to refresh token", HttpStatusCodes.BAD_REQUEST);
    }
  }

  async generatePasswordResetLink(email: string): Promise<string> {
    logger.info(`🔐 Generating password reset link for: ${email}`);
    try {
      const resetLink = await admin.auth().generatePasswordResetLink(email);
      const restLinkTemplate = await TemplateService.renderTemplate("petsnapchat_password_reset", {
  USERNAME: "John Doe",
  RESET_LINK: resetLink
});
      await sendEmail([email], { subject: restLinkTemplate.subject, text: restLinkTemplate.text, html: restLinkTemplate.html });
      return "Password reset link sent to email";
    } catch (err: any) {
      logger.error(`❌ Password reset failed for ${email}: ${err.message}`, err);
      throw this.createError(err.message || "Failed to generate password reset link", HttpStatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async signupWithGoogle(args: GoogleSignupArgs): Promise<User> {
    logger.info(`🔄 Starting Google signup`);
    try {
      const { idToken, dob, phoneNumber } = args;
      const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) throw this.createError("Google account does not have an email", HttpStatusCodes.BAD_REQUEST);

      const { sub: googleUid, email, name, picture } = payload;
      let firebaseUser;
      try {
        firebaseUser = await admin.auth().getUser(googleUid);
      } catch (err: any) {
        if (err.code === "auth/user-not-found") firebaseUser = await admin.auth().createUser({ uid: googleUid, email, displayName: name, photoURL: picture });
        else throw err;
      }

      let user = await this.userRepo.findOne({ where: { email } });
      if (!user) {
        user = this.userRepo.create({ firstName: name || "", email, dob, phoneNumber, isVerified: true });
        await this.userRepo.save(user);
      }
      return user;
    } catch (error: any) {
      logger.error(`❌ Google signup failed: ${error.message}`, error);
      throw this.createError(error.message, error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async resendEmailVerificationOtp(email: string): Promise<{ otp: string }> {
    logger.info(`🔄 Resending email verification OTP for: ${email}`);
    try {
      const type = "signup_email_verification";
      await this.userOTPRepo.deleteByUserAndType(email, type);

      const otp = await sendOTPEmail(email);

      const ttlMinutes = 10;
      const expireAt = Date.now() + ttlMinutes * 60 * 1000;

      await UserOTP.create({ userId: email, type: "signup_email_verification", otp, expireAt, createdAt: Date.now() });
      
      return { otp };
    } catch (error: any) {
      logger.error(`❌ Resend OTP failed for ${email}: ${error.message}`, error);
      throw this.createError(error.message, error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async getUsers(): Promise<UserResponseDto[]> {
    logger.info(`📊 Fetching all users from database`);
    try {
      const users = await this.userRepo.find();
      return users.map(user => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        phoneNumber: user.phoneNumber,
        dob: user.dob,
        isVerified: user.isVerified,
      }));
    } catch (error: any) {
      logger.error(`❌ Failed to fetch users: ${error.message}`, error);
      throw this.createError(error.message, error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserResponseDto> {
  logger.info(`🔄 Updating profile for userId: ${userId}`);
  try {
    // 1️⃣ Find user by ID
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      logger.warn(`⚠️ User not found: ${userId}`);
      throw this.createError("User not found", HttpStatusCodes.NOT_FOUND);
    }

    // 2️⃣ Update only the provided fields
    if (input.firstName !== undefined) user.firstName = input.firstName;
    if (input.lastName !== undefined) user.lastName = input.lastName;
    if (input.dob !== undefined) user.dob = input.dob;
    if (input.phoneNumber !== undefined) user.phoneNumber = input.phoneNumber;

    // 3️⃣ Save updated user
    await this.userRepo.save(user);
    logger.info(`✅ User profile updated successfully: ${userId}`);

    // 4️⃣ Return updated user info
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      username: user.username,
      phoneNumber: user.phoneNumber,
      dob: user.dob,
      isVerified: user.isVerified,
    };
  } catch (error: any) {
    logger.error(`❌ Failed to update profile for ${userId}: ${error.message}`, error);
    throw this.createError(
      error.message || "Failed to update profile",
      error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
}
}
