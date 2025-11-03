// src/resolvers/UserResolver.ts
import { Resolver, Query, Mutation, Args } from "type-graphql";
import { UserService } from "../service/user.service";
import { SignupArgs,UserResponseDto } from "./dto/userResolverDto";


@Resolver()
export class UserResolver {
  private userService = new UserService();

  @Query(() => [UserResponseDto])
  async getUsers(): Promise<UserResponseDto[]> {
    return await this.userService.getUsers();
  }

@Mutation(() => UserResponseDto)
async createUser(@Args() User: SignupArgs): Promise<any> {
  const data=await this.userService.createUser(User);
    return data
  }
}
