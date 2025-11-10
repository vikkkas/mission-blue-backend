import { z } from 'zod';

export const mobileSchema = z.object({
  mobile: z.string().min(10).max(15).regex(/^\+?[1-9]\d{1,14}$/),
});

export const emailSchema = z.object({
  email: z.string().email(),
});

export const verifyOTPSchema = z.object({
  contact: z.string(), // mobile or email
  code: z.string().length(6),
});

export const registerMobileSchema = z.object({
  mobile: z.string().min(10).max(15).regex(/^\+?[1-9]\d{1,14}$/),
  name: z.string().min(2).max(100).optional(),
});

export const registerEmailSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100).optional(),
});
