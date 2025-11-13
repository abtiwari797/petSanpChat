import { getDBRepository } from "../db/repository";
import { User } from "../entities/User";
import { GoogleSignupArgs, SignupArgs, UserResponseDto } from "../resolvers/dto/userResolverDto";
import { sendOTPEmail } from "../utils/sentOtp";
import { UserOTP } from "../model/userOtpSchema";
import admin from "../config/firebase";
import axios from "axios";
import dotenv from "dotenv";
import { sendEmail } from "../utils/emailService";
import { OAuth2Client } from "google-auth-library";
import { UserOTPRepository } from "../repository/UserOTPRepository";
import { logger } from "../utils/logger";

dotenv.config();

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY!;
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
export class UserService {
  private userRepo = getDBRepository(User);
  private userOTPRepo = new UserOTPRepository();

  /**
   * Signup user with Firebase + save in PostgreSQL + send OTP
   */
  async createUser(args: SignupArgs) {
    const { firstName, lastName, username, email, password, dob, phoneNumber } =
      args;

    logger.info(`🔄 Starting user signup for email: ${email}`);

    try {
      // 1️⃣ Check if user exists in DB
      logger.info(`📊 Checking if user exists: ${email}`);
      const existing = await this.userRepo.findOne({
        where: [{ email }, { username }],
      });

      if (existing) {
        logger.warn(`⚠️ User already exists: ${email}`);
        throw new Error("User already exists");
      }

      // 2️⃣ Create Firebase user
      logger.info(`🔐 Creating Firebase user for: ${email}`);
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: `${firstName} ${lastName}`,
      });
      logger.info(`✅ Firebase user created with UID: ${userRecord.uid}`);

      // 3️⃣ Generate email verification link
      logger.info(`📧 Generating email verification link for: ${email}`);
      const verificationLink = await admin
        .auth()
        .generateEmailVerificationLink(email);
      logger.info(`✅ Verification link generated`);

      // 4️⃣ Send OTP email
      logger.info(`💌 Sending OTP email to: ${email}`);
      const otp = await sendOTPEmail(email); // returns the OTP string
      logger.info(`✅ OTP sent successfully`);

      // 5️⃣ Save OTP in MongoDB
      logger.info(`💾 Saving OTP record in MongoDB for user: ${email}`);
      const ttlMinutes = 10;
      const expireAt = Date.now() + ttlMinutes * 60 * 1000;

      await UserOTP.create({
        userId: email,
        type: "signup_email_verification",
        otp,
        expireAt,
        createdAt: Date.now(),
      });
      logger.info(`✅ OTP record saved successfully`);

      // 6️⃣ Save user in PostgreSQL
      logger.info(`💾 Saving user to PostgreSQL database`);
      const user = this.userRepo.create({
        firebaseId: userRecord.uid,
        firstName,
        lastName,
        username,
        email,
        dob,
        phoneNumber,
        isVerified: false, // until OTP verified
      });
      await this.userRepo.save(user);
      logger.info(`✅ User saved to PostgreSQL successfully`);

      return { user, verificationLink  };
    } catch (error: any) {
      logger.error(`❌ Signup error for ${email}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Login user via Firebase email/password
   */
  async login(email: string, password: string) {
    logger.info(`🔄 Login attempt for email: ${email}`);

    try {
      // 1️⃣ Check if user exists in DB
      logger.info(`📊 Looking up user in database: ${email}`);
      const user = await this.userRepo.findOne({ where: { email } });

      if (!user) {
        logger.warn(`⚠️ User not found: ${email}`);
        throw new Error("User not found. Please sign up first.");
      }
      logger.info(`✅ User found in database`);

      // 2️⃣ Check if email is verified
      logger.info(`🔍 Checking email verification status for: ${email}`);
      if (!user.isVerified) {
        logger.warn(`⚠️ Email not verified for user: ${email}`);
        throw new Error("Email is not verified. Please verify your email first.");
      }
      logger.info(`✅ Email is verified`);

      // 3️⃣ If user exists and verified, call Firebase login
      logger.info(`🔐 Authenticating with Firebase for: ${email}`);
      const response = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
        {
          email,
          password,
          returnSecureToken: true,
        }
      );
      logger.info(`✅ Firebase authentication successful for: ${email}`);

      return {
        idToken: response.data.idToken,
        refreshToken: response.data.refreshToken,
        uid: response.data.localId,
        email: response.data.email,
      };
    } catch (error: any) {
      logger.error(`❌ Login error for ${email}: ${error.message}`, error);
      throw new Error(error.response?.data?.error?.message || "Login failed");
    }
  }

  /**
   * Verify Firebase ID token
   */
  async verifyToken(idToken: string) {
    logger.info(`🔍 Verifying ID token`);
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      logger.info(`✅ ID token verified for user: ${decodedToken.uid}`);
      return { uid: decodedToken.uid, email: decodedToken.email! };
    } catch (error: any) {
      logger.error(`❌ Token verification failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Refresh Firebase token
   */
  async refreshToken(refreshToken: string) {
    logger.info(`🔄 Refreshing Firebase token`);
    try {
      const url = `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`;
      logger.info(`📡 Calling Firebase token endpoint`);
      const response = await axios.post(url, {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      });
      logger.info(`✅ Token refreshed successfully`);

      return {
        idToken: response.data.id_token,
        refreshToken: response.data.refresh_token,
        uid: response.data.user_id,
        email: "", // optional
      };
    } catch (err: any) {
      logger.error(`❌ Token refresh failed: ${err.message}`, err);
      throw new Error(
        err.response?.data?.error?.message || "Failed to refresh token"
      );
    }
  }

  async generatePasswordResetLink(email: string): Promise<string> {
    logger.info(`🔐 Generating password reset link for: ${email}`);
    try {
      logger.info(`📧 Creating reset link via Firebase`);
      const resetLink = await admin.auth().generatePasswordResetLink(email);
      logger.info(`✅ Reset link generated`);

      const payload = {
        subject: "Password Reset Request",
        text: `Click the link to reset your password: ${resetLink}`,
        html: `<p>Click the link to reset your password: <a href="${resetLink}">${resetLink}</a></p>`,
      };

      // Send email
      logger.info(`💌 Sending password reset email to: ${email}`);
      await sendEmail([email], payload);
      logger.info(`✅ Password reset email sent successfully`);
      return "Password reset link sent to email";
    } catch (err: any) {
      logger.error(`❌ Password reset failed for ${email}: ${err.message}`, err);
      throw new Error(err.message || "Failed to generate password reset link");
    }
  }

  async signupWithGoogle(args: GoogleSignupArgs): Promise<User> {
    logger.info(`🔄 Starting Google signup`);
    try {
      const { idToken, dob, phoneNumber } = args;

      // ------------------------------
      // 1️⃣ Verify Google ID token
      // ------------------------------
      logger.info(`🔍 Verifying Google ID token`);
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      logger.info(`✅ Google ID token verified`);

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        logger.warn(`⚠️ Google account does not have an email`);
        throw new Error("Google account does not have an email");
      }

      const { sub: googleUid, email, name, picture } = payload;
      logger.info(`✅ Google payload extracted for email: ${email}`);

      // ------------------------------
      // 2️⃣ Check or create Firebase user
      // ------------------------------
      logger.info(`🔐 Checking/creating Firebase user for: ${email}`);
      let firebaseUser;
      try {
        firebaseUser = await admin.auth().getUser(googleUid);
        logger.info(`✅ Firebase user already exists`);
      } catch (err: any) {
        if (err.code === "auth/user-not-found") {
          logger.info(`📝 Creating new Firebase user for: ${email}`);
          firebaseUser = await admin.auth().createUser({
            uid: googleUid,
            email,
            displayName: name,
            photoURL: picture,
          });
          logger.info(`✅ Firebase user created successfully`);
        } else {
          throw err;
        }
      }

      // ------------------------------
      // 3️⃣ Check or create PostgreSQL user
      // ------------------------------
      logger.info(`💾 Checking/creating PostgreSQL user for: ${email}`);
      let user = await this.userRepo.findOne({ where: { email } });
      if (!user) {
        logger.info(`📝 Creating new PostgreSQL user for: ${email}`);
        user = this.userRepo.create({
          firstName: name || "",
          email,
          dob,
          phoneNumber,
          isVerified: true,
        });
        await this.userRepo.save(user);
        logger.info(`✅ PostgreSQL user created successfully`);
      } else {
        logger.info(`✅ PostgreSQL user already exists`);
      }

      return user;
    } catch (error: any) {
      logger.error(`❌ Google signup failed: ${error.message}`, error);
      throw error;
    }
  }

  async resendEmailVerificationOtp(email: string): Promise<{ otp: string }> {
    logger.info(`🔄 Resending email verification OTP for: ${email}`);
    try {
      const type = "signup_email_verification";

      // 1️⃣ Delete any existing OTP for this user & type
      logger.info(`🗑️ Deleting old OTP records`);
      await this.userOTPRepo.deleteByUserAndType(email, type);
      logger.info(`✅ Old OTP records deleted`);

      // 2️⃣ Generate a new OTP
      logger.info(`📝 Generating new OTP`);
      const otp = await sendOTPEmail(email); // generate/send new OTP
      logger.info(`✅ New OTP generated and email sent`);

      // 3️⃣ Save OTP in MongoDB
      logger.info(`💾 Saving OTP record in MongoDB`);
      const ttlMinutes = 10;
      const expireAt = Date.now() + ttlMinutes * 60 * 1000;

      this.userOTPRepo.create({
        userId: email,
        otp,
        type,
        expireAt,
        createdAt: Date.now(),
      });
      logger.info(`✅ OTP record saved successfully`);

      return { otp }; // optionally return only success message
    } catch (error: any) {
      logger.error(`❌ Resend OTP failed for ${email}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * List all users from PostgreSQL
   */
  async getUsers(): Promise<UserResponseDto[]>  {
    logger.info(`📊 Fetching all users from database`);
    try {
      const users = await this.userRepo.find();
      logger.info(`✅ Retrieved ${users.length} users`);
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
      throw error;
    }
  }
}
