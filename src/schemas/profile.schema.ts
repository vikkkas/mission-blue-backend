import { z } from 'zod';

export const interestOptions = [
  'Sustainability',
  'Technology',
  'Startups',
  'Culture',
  'Policy',
  'Education',
] as const;

const interestEnum = z.enum(interestOptions);

const checkboxBoolean = z.preprocess((val) => {
  if (typeof val === 'string') {
    return ['true', '1', 'yes', 'on'].includes(val.toLowerCase());
  }
  return val;
}, z.boolean());

const requiredConsent = checkboxBoolean.refine((val) => val === true, 'Consent is required');

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(200),
  dob: z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date'),
  gender: z.string().trim().min(1),
  nationality: z.string().trim().min(1),
  passport: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined)),
  email: z.string().trim().email(),
  mobile: z.string().trim().min(10).max(15).regex(/^\+?[1-9]\d{1,14}$/),
  altMobile: z
    .string()
    .trim()
    .min(10)
    .max(15)
    .regex(/^\+?[1-9]\d{1,14}$/)
    .optional(),
  address: z.string().trim().min(5),
  pincode: z.string().trim().min(4).max(10),
  organization: z.string().trim().min(2),
  designation: z.string().trim().min(2),
  industry: z.string().trim().min(2),
  linkedin: z.string().trim().url().optional(),
  referral: z.string().trim().optional(),
  volunteer: z.string().trim().optional(),
  interests: z
    .preprocess((val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          // ignore
        }
        return val
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      }
      return [];
    }, z.array(interestEnum))
    .optional()
    .default([]),
  photoUrl: z.string().trim().url().optional(),
  idProofUrl: z.string().trim().url().optional(),
  studentIdUrl: z.string().trim().url().optional(),
  consents: z.object({
    terms: requiredConsent,
    media: requiredConsent,
    data: requiredConsent,
  }),
});

export type ProfilePayload = z.infer<typeof profileSchema>;
