// src/resolvers/dto/otpResolverDto.ts
import { ArgsType, Field, ObjectType } from "type-graphql";

@ArgsType()
export class VerifyOtpArgs {
  @Field()
  email!: string;

  @Field()
  otp!: string;
// e.g., "signup_email_verification"
}
@ObjectType()
export class VerifyOtpResponse {
  @Field(() => Boolean)
  success!: boolean; // match your resolver

  @Field(() => String, { nullable: true })
  message?: string; // match your resolver
}
