import { Entity, PrimaryGeneratedColumn, Column, Unique } from "typeorm";
import { ObjectType, Field, ID } from "type-graphql";

@ObjectType()
@Entity()
@Unique(["firebaseId"])
@Unique(["email"])
@Unique(["username"]) // ✅ new unique username
export class User {
  @Field(() => ID)
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Field()
  @Column()
  firstName!: string;

  @Field()
  @Column()
  lastName!: string;

  @Field()
  @Column({ unique: true })
  email!: string;

  @Field()
  @Column({ unique: true })
  username!: string;

  @Field()
  @Column({ unique: true })
  firebaseId!: string;

  @Field()
  @Column()
  dob!: string;

  @Field()
  @Column()
  phoneNumber!: string;

  @Field()
  @Column({ default: false })
  isVerified!: boolean;
}
