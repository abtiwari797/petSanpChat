import { ArgsType, Field, ObjectType } from "type-graphql";

 
@ArgsType()
export class SignupArgs {
  @Field()
  firstName!: string;

  @Field()
  lastName!: string;

  @Field(()=>String ,{nullable:false})
  username!: string;

  @Field(()=>String, {nullable:false})
  email!: string;

  @Field(()=>String ,{nullable:false})
  password!: string; // Only passed to Clerk

  @Field()
  dob!: string; // YYYY-MM-DD

  @Field()
  phoneNumber!: string;
}


    
@ObjectType()
export class UserResponseDto {
     @Field(()=> String)
      id!: string;

@Field({ nullable: true })
  name?: string;

@Field({ nullable: true })
email?: string;
}