import nodemailer from 'nodemailer';
import dotenv from "dotenv";
dotenv.config();

// Generate a 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP email
export async function sendOTPEmail(recipientEmail: string) {
  const otp = generateOTP();

  // Store OTP in your DB or cache with expiration (not shown here)

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
    to: recipientEmail,
    subject: 'Your OTP Code',
    text: `Your OTP code is: ${otp}`,
    html: `<p>Your OTP code is: <strong>${otp}</strong></p>`,
  };

await transporter.sendMail(mailOptions);

  return otp;
}