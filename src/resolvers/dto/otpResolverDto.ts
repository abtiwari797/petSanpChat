// src/resolvers/dto/otpResolverDto.ts
import { ArgsType, Field, ObjectType } from "type-graphql";

@ArgsType()
export class VerifyOtpArgs {
  @Field()
  email!: string;

  @Field()
  otp!: string;

  @Field()
  type!: string; // e.g., "signup_email_verification"
}
@ObjectType()
export class VerifyOtpResponse {
  @Field(() => Boolean)
  success!: boolean; // match your resolver

  @Field(() => String, { nullable: true })
  message?: string; // match your resolver
}

@ArgsType()
export class ForgotPasswordArgs {
  @Field()
  email!: string;
}

@ArgsType()
export class ResetPasswordArgs {
  @Field()
  email!: string;

  @Field()
  otp!: string;

  @Field()
  newPassword!: string;

  @Field({ nullable: true })
  type?: string; // optional, defaults to "password_reset"
}

@ArgsType()
export class ChangePasswordArgs {
  @Field({ nullable: true })
  currentPassword?: string; // optional: we rely on session, include if you want extra verification

  @Field()
  newPassword!: string;
}
