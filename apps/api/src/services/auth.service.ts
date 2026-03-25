import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import type { User } from '@axios-pay/types';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;

// ─── Email transport ──────────────────────────────────────────────────────────

const mailer = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

// ─── SMS client ───────────────────────────────────────────────────────────────

const smsClient = twilio(env.TWILIO_SID, env.TWILIO_TOKEN);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

function otpExpiry(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + OTP_EXPIRY_MINUTES);
  return expiry;
}

async function sendEmailOtp(email: string, otp: string, firstName: string): Promise<void> {
  await mailer.sendMail({
    from: `"Axios Pay" <${env.SMTP_USER}>`,
    to: email,
    subject: 'Verify your email – Axios Pay',
    html: `
      <h2>Hi ${firstName},</h2>
      <p>Your Axios Pay email verification code is:</p>
      <h1 style="font-size:48px;letter-spacing:8px;color:#2563eb;">${otp}</h1>
      <p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  });
}

async function sendSmsOtp(phone: string, otp: string): Promise<void> {
  await smsClient.messages.create({
    body: `Your Axios Pay phone verification code is: ${otp}. Expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    from: env.TWILIO_FROM,
    to: phone,
  });
}

function stripPasswordHash(user: { passwordHash: string; emailOtp: string | null; phoneOtp: string | null; [key: string]: unknown }): User {
  const { passwordHash: _ph, emailOtp: _eo, phoneOtp: _po, otpExpiry: _oe, ...safeUser } = user as {
    passwordHash: string;
    emailOtp: string | null;
    phoneOtp: string | null;
    otpExpiry: Date | null;
    [key: string]: unknown;
  };
  return {
    ...safeUser,
    createdAt: (safeUser.createdAt as Date).toISOString(),
    updatedAt: (safeUser.updatedAt as Date).toISOString(),
  } as User;
}

function signTokens(userId: string, email: string): { accessToken: string; refreshToken: string } {
  const accessToken = jwt.sign({ userId, email }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);

  const refreshToken = jwt.sign({ userId, email }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);

  return { accessToken, refreshToken };
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function register(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}): Promise<{ message: string }> {
  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) {
    throw new AppError('EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
  const emailOtp = generateOtp();
  const expiry = otpExpiry();

  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone ?? null,
      passwordHash,
      emailOtp,
      otpExpiry: expiry,
    },
  });

  // Create default wallets for all currencies
  const currencies = ['NGN', 'UGX', 'KES', 'GHS', 'ZAR'] as const;
  await prisma.wallet.createMany({
    data: currencies.map((currency) => ({ userId: user.id, currency, balance: 0 })),
  });

  await sendEmailOtp(user.email, emailOtp, user.firstName);

  return { message: 'Registration successful. Check your email for a verification code.' };
}

export async function verifyEmail(data: {
  email: string;
  otp: string;
}): Promise<{ message: string }> {
  const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });

  if (
    !user ||
    user.emailOtp !== data.otp ||
    !user.otpExpiry ||
    user.otpExpiry < new Date()
  ) {
    throw new AppError('INVALID_OTP');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailOtp: null,
      otpExpiry: null,
    },
  });

  // Send phone OTP if phone was provided
  if (user.phone) {
    const phoneOtp = generateOtp();
    const expiry = otpExpiry();
    await prisma.user.update({
      where: { id: user.id },
      data: { phoneOtp, otpExpiry: expiry },
    });
    await sendSmsOtp(user.phone, phoneOtp);
    return { message: 'Email verified. A verification code has been sent to your phone.' };
  }

  return { message: 'Email verified successfully.' };
}

export async function verifyPhone(data: {
  phone: string;
  otp: string;
}): Promise<{ message: string }> {
  const user = await prisma.user.findUnique({ where: { phone: data.phone } });

  if (
    !user ||
    user.phoneOtp !== data.otp ||
    !user.otpExpiry ||
    user.otpExpiry < new Date()
  ) {
    throw new AppError('INVALID_OTP');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      phoneVerified: true,
      phoneOtp: null,
      otpExpiry: null,
    },
  });

  return { message: 'Phone verified successfully.' };
}

export async function login(data: {
  email: string;
  password: string;
}): Promise<{ user: User; accessToken: string; refreshToken: string }> {
  const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });

  if (!user) {
    throw new AppError('INVALID_CREDENTIALS');
  }

  const passwordMatch = await bcrypt.compare(data.password, user.passwordHash);
  if (!passwordMatch) {
    throw new AppError('INVALID_CREDENTIALS');
  }

  const { accessToken, refreshToken } = signTokens(user.id, user.email);

  return {
    user: stripPasswordHash(user),
    accessToken,
    refreshToken,
  };
}

export async function refreshTokens(token: string): Promise<{ accessToken: string; refreshToken: string }> {
  let payload: { userId: string; email: string };

  try {
    payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string; email: string };
  } catch {
    throw new AppError('UNAUTHORIZED');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    throw new AppError('UNAUTHORIZED');
  }

  return signTokens(user.id, user.email);
}

export async function getMe(userId: string): Promise<User> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return stripPasswordHash(user);
}
