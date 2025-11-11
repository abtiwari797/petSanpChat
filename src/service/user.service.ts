import { getDBRepository } from "../db/repository";
import { User } from "../entities/User";
import { GoogleSignupArgs, SignupArgs } from "../resolvers/dto/userResolverDto";
import { sendOTPEmail } from "../utils/sentOtp";
import { UserOTP } from "../model/userOtpSchema";
import admin from "../config/firebase";
import axios from "axios";
import dotenv from "dotenv";
import { sendEmail } from "../utils/emailService";
import { OAuth2Client } from "google-auth-library";
import { UserOTPRepository } from "../repository/UserOTPRepository";

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

    // 1️⃣ Check if user exists in DB
    const existing = await this.userRepo.findOne({
      where: [{ email }, { username }],
    });

    if (existing) throw new Error("User already exists");

    // 2️⃣ Create Firebase user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
    });

    // 3️⃣ Generate email verification link
    const verificationLink = await admin
      .auth()
      .generateEmailVerificationLink(email);

    // 4️⃣ Send OTP email
    const otp = await sendOTPEmail(email); // returns the OTP string

    // 5️⃣ Save OTP in MongoDB
    const ttlMinutes = 10;
    const expireAt = Date.now() + ttlMinutes * 60 * 1000;

    await this.userOTPRepo.create({
      userId: email,
      type: "signup_email_verification",
      otp,
      expireAt,
      createdAt: Date.now(),
    });

    // 6️⃣ Save user in PostgreSQL
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

    return {
      uid: userRecord.uid,
      email: userRecord.email!,
      displayName: userRecord.displayName!,
      verificationLink,
      otp, // optional: for testing
    };
  }

  /**
   * Login user via Firebase email/password
   */
  async login(email: string, password: string) {
    // 1️⃣ Check if user exists in DB
    const user = await this.userRepo.findOne({ where: { email } });

    if (!user) {
      throw new Error("User not found. Please sign up first.");
    }

    // 2️⃣ Check if email is verified
    if (!user.isVerified) {
      throw new Error("Email is not verified. Please verify your email first.");
    }

    // 3️⃣ If user exists and verified, call Firebase login
    try {
      const response = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
        {
          email,
          password,
          returnSecureToken: true,
        }
      );

      return {
        idToken: response.data.idToken,
        refreshToken: response.data.refreshToken,
        uid: response.data.localId,
        email: response.data.email,
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || "Login failed");
    }
  }

  /**
   * Verify Firebase ID token
   */
  async verifyToken(idToken: string) {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return { uid: decodedToken.uid, email: decodedToken.email! };
  }

  /**
   * Refresh Firebase token
   */
  async refreshToken(refreshToken: string) {
    try {
      const url = `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`;
      const response = await axios.post(url, {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      });

      return {
        idToken: response.data.id_token,
        refreshToken: response.data.refresh_token,
        uid: response.data.user_id,
        email: "", // optional
      };
    } catch (err: any) {
      throw new Error(
        err.response?.data?.error?.message || "Failed to refresh token"
      );
    }
  }

  async generatePasswordResetLink(email: string): Promise<string> {
    try {
      const resetLink = await admin.auth().generatePasswordResetLink(email);
      const payload = {
        subject: "Password Reset Request",
        text: `Click the link to reset your password: ${resetLink}`,
        html: `<p>Click the link to reset your password: <a href="${resetLink}">${resetLink}</a></p>`,
      };

      // Send email
      await sendEmail([email], payload);
      return "Password reset link sent to email";
    } catch (err: any) {
      throw new Error(err.message || "Failed to generate password reset link");
    }
  }

  async signupWithGoogle(args: GoogleSignupArgs): Promise<User> {
    const { idToken, dob, phoneNumber } = args;

    // ------------------------------
    // 1️⃣ Verify Google ID token
    // ------------------------------
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email)
      throw new Error("Google account does not have an email");

    const { sub: googleUid, email, name, picture } = payload;

    // ------------------------------
    // 2️⃣ Check or create Firebase user
    // ------------------------------
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().getUser(googleUid);
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        firebaseUser = await admin.auth().createUser({
          uid: googleUid,
          email,
          displayName: name,
          photoURL: picture,
        });
      } else {
        throw err;
      }
    }

    // ------------------------------
    // 3️⃣ Check or create PostgreSQL user
    // ------------------------------
    let user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      user = this.userRepo.create({
        firstName: name || "",
        email,
        dob,
        phoneNumber,
        isVerified: true,
      });
      await this.userRepo.save(user);
    }

    return user;
  }

  async resendEmailVerificationOtp(email: string): Promise<{ otp: string }> {
    const type = "signup_email_verification";

    // 1️⃣ Delete any existing OTP for this user & type
    await this.userOTPRepo.deleteByUserAndType(email, type);

    // 2️⃣ Generate a new OTP
    const otp = await sendOTPEmail(email); // generate/send new OTP

    // 3️⃣ Save OTP in MongoDB
    const ttlMinutes = 10;
    const expireAt = Date.now() + ttlMinutes * 60 * 1000;

    this.userOTPRepo.create({
      userId: email,
      otp,
      type,
      expireAt,
      createdAt: Date.now(),
    });

    return { otp }; // optionally return only success message
  }

  /**
   * List all users from PostgreSQL
   */
  async getUsers() {
    return await this.userRepo.find();
  }
}
