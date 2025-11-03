// src/services/user.service.ts
import { getDBRepository } from "../db/repository";
import { User } from "../entities/User";
import { clerk } from "../config/clerk";
import { SignupArgs } from "../resolvers/dto/userResolverDto";

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
      publicMetadata: {
        dob,
        phoneNumber,
      },

    });

    // ✅ Store in DB
    const user = this.userRepo.create({
      clerkId: clerkUser.id,
      firstName,
      lastName,
      username,
      email,
      dob,
      phoneNumber,
    });

    await this.userRepo.save(user);

    return user;
  }

  async getUsers() {
    return await this.userRepo.find();
  }
}
