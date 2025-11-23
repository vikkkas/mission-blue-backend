import { z } from 'zod';

export const mobileSchema = z.object({
  mobile: z.string().min(10).max(15).regex(/^\+?[1-9]\d{1,14}$/),
});

export const emailSchema = z.object({
  email: z.string().email(),
});

const passwordSchema = z.string().min(8, 'Password must be at least 8 characters long');

export const registerMobileSchema = z.object({
  mobile: z.string().min(10).max(15).regex(/^\+?[1-9]\d{1,14}$/),
  name: z.string().min(2).max(100).optional(),
  password: passwordSchema,
});

export const registerEmailSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100).optional(),
  password: passwordSchema,
});

export const loginWithMobileSchema = z.object({
  mobile: z.string().min(10).max(15).regex(/^\+?[1-9]\d{1,14}$/),
  password: passwordSchema,
});

export const loginWithEmailSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
});

export const resendVerificationSchema = z.object({
  email: z.string().email(),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
});
