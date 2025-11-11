// src/services/otp.service.ts

import { sendEmail } from "../utils/emailService";


// src/utils/otpGenerator.ts
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOTPEmail(email: string) {
  const otp = generateOTP();

  const payload = {
    subject: 'Your OTP Code',
    text: `Your OTP code is: ${otp}`,
    html: `<p>Your OTP code is: <strong>${otp}</strong></p>`,
  };

  await sendEmail([email], payload);

  return otp;
}
