import { Webhook, WebhookRequiredHeaders } from "svix";
import { Request, Response } from "express";
import { AppDataSource } from "../config/postgres";
import { User } from "../entities/User";
import { logger } from "../utils/logger";
import dotenv from "dotenv";
dotenv.config()
export const clerkWebhook = async (
  req: Request & { rawBody?: string },
  res: Response
) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET!;
  const wh = new Webhook(webhookSecret);

  let event;
  try {
    event = wh.verify(
      req.rawBody!,
      req.headers as unknown as WebhookRequiredHeaders
    ) as any;

    logger.info(`Clerk webhook received: ${event.type}`);
  } catch (err) {
    logger.error(`❌ Clerk webhook signature invalid: ${err}`);
    return res.status(400).send("Invalid signature");
  }

  const repo = AppDataSource.getRepository(User);

  if (event.type === "user.created" || event.type === "user.updated") {
    const u = event.data;

    const email = u.email_addresses?.[0]?.email_address ?? null;
    const firstName = u.first_name ?? "";
    const lastName = u.last_name ?? "";
    const name = `${firstName} ${lastName}`.trim();
   const username =
  u.username ??
  u.email_addresses?.[0]?.email_address?.split("@")[0] ??
  `user_${u.id.slice(-6)}`;

    // Metadata fields
    const dob = u.public_metadata?.dob ?? null;
    const phoneNumber = u.public_metadata?.phoneNumber ?? null;

    try {
      await repo.upsert(
        {
          clerkId: u.id,
          email,
          firstName,
          lastName,
          username,
          dob,
          phoneNumber
        },
        ["clerkId"] // conflict only on clerkId
      );
    } catch (err: any) {
      // email exists but belongs to another user
if (
  err.code === "23505" &&
  (err.detail.includes("(email)") || err.detail.includes("(username)"))
) {
        logger.warn(`⚠️ Email exists, linking record instead: ${email}`);

        await repo.update(
          { email },
          { clerkId: u.id, firstName, lastName, username, dob, phoneNumber }
        );
      } 
      // username exists
      else if (err.code === "23505" && err.detail.includes("(username)")) {
        logger.error(`⚠️ Username conflict for: ${username}`);
      } 
      else {
        throw err;
      }
    }

    logger.info(`✅ User synced to DB: ${u.id}`);
  }

  if (event.type === "user.deleted") {
    await repo.delete({ clerkId: event.data.id });
    logger.warn(`🗑️ User removed from DB: ${event.data.id}`);
  }

  return res.json({ ok: true });
};
