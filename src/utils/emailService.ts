// src/utils/emailService.ts
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

interface EmailPayload {
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(recipients: string[], payload: EmailPayload) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // or your SMTP provider
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER, // your email
      pass: process.env.SMTP_PASS, // your app password
    },
  });

  const mailOptions = {
    from: '"Your App" <no-reply@yourapp.com>',
    to: recipients.join(','), // array to comma-separated string
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  };

  await transporter.sendMail(mailOptions);
}
