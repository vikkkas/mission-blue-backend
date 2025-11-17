import { z } from 'zod';

// Enum schemas matching Prisma enums
export const GenderEnum = z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']);

export const IndustryEnum = z.enum([
  'TECHNOLOGY',
  'EDUCATION',
  'HEALTHCARE',
  'FINANCE',
  'MANUFACTURING',
  'RETAIL',
  'CONSULTING',
  'GOVERNMENT',
  'NON_PROFIT',
  'MEDIA',
  'HOSPITALITY',
  'REAL_ESTATE',
  'AGRICULTURE',
  'ENERGY',
  'TRANSPORTATION',
  'TELECOMMUNICATIONS',
  'LEGAL',
  'ENTERTAINMENT',
  'CONSTRUCTION',
  'OTHER',
]);

export const AttendanceTypeEnum = z.enum(['IN_PERSON', 'VIRTUAL']);

export const MealPreferenceEnum = z.enum(['VEG', 'NON_VEG', 'VEGAN', 'JAIN', 'OTHER']);

export const TShirtSizeEnum = z.enum(['XS', 'S', 'M', 'L', 'XL', 'XXL']);

export const HeardAboutEventEnum = z.enum([
  'SOCIAL_MEDIA',
  'FRIEND',
  'EMAIL',
  'POSTER',
  'GDG',
  'OTHER',
]);

// Days attending options
const daysAttendingOptions = z.enum(['Day 1', 'Day 2', 'Day 3']);

// Session options
const sessionOptions = z.enum([
  'Keynotes',
  'Panel Discussions',
  'Workshops',
  'Networking',
  'Exhibition',
  'Hackathon',
  'Startup Pitches',
  'Cultural Events',
]);

// Areas of interest options
const areasOfInterestOptions = z.enum([
  'Sustainability',
  'Technology',
  'Startups',
  'Culture',
  'Innovation',
  'Education',
  'Healthcare',
  'Finance',
  'Other',
]);

// Main attendee creation schema (user must be authenticated)
export const createAttendeeSchema = z.object({
  // A. Personal Information
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  dateOfBirth: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }),
  gender: GenderEnum,
  nationality: z.string().min(2).max(50),
  documentNumber: z.string().optional(),

  // B. Contact Information (mobileNumber comes from authenticated user, but can be updated)
  mobileNumber: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number format (must be 10 digits)'),
  alternateContactNumber: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid mobile number format')
    .optional()
    .or(z.literal('')),
  residentialAddress: z.string().min(10).max(500),
  pinCode: z.string().regex(/^\d{6}$/, 'Invalid PIN code (must be 6 digits)'),

  // C. Professional Details
  organization: z.string().min(2).max(100),
  designation: z.string().min(2).max(100),
  industry: IndustryEnum,
  linkedinUrl: z
    .string()
    .url('Invalid LinkedIn URL')
    .regex(/linkedin\.com/, 'Must be a LinkedIn URL')
    .optional()
    .or(z.literal('')),

  // D. Event-Specific Details
  attendanceType: AttendanceTypeEnum,
//   daysAttending: z.array(daysAttendingOptions).min(1, 'Select at least one day'),
//   sessionsInterested: z.array(sessionOptions).min(1, 'Select at least one session'),
//   accommodationRequired: z.boolean().or(z.string().transform((val) => val === 'true')),
  mealPreference: MealPreferenceEnum,
  tshirtSize: TShirtSizeEnum,

  // F. Emergency Details
  emergencyContactName: z.string().min(2).max(100),
  emergencyContactNumber: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid emergency contact number'),
  emergencyRelationship: z.string().min(2).max(50),

  // G. Consent & Verification
//   termsAccepted: z.boolean().refine((val) => val === true, {
//     message: 'You must accept the terms and conditions',
//   }),
//   photoVideoConsent: z.boolean(),
//   dataPrivacyAgreement: z.boolean().refine((val) => val === true, {
//     message: 'You must agree to the data privacy policy',
//   }),

  // H. Optional Analytics
  heardAboutEvent: HeardAboutEventEnum.optional(),
  volunteerInterest: z.boolean().optional().or(z.string().transform((val) => val === 'true')),
  areasOfInterest: z.array(areasOfInterestOptions).optional().default([]),
});

// Update attendee schema (all fields optional except consents)
export const updateAttendeeSchema = z.object({
  // A. Personal Information
  fullName: z.string().min(2).max(100).optional(),
  dateOfBirth: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid date format',
    })
    .optional(),
  gender: GenderEnum.optional(),
  nationality: z.string().min(2).max(50).optional(),
  documentNumber: z.string().optional(),

  // B. Contact Information
  mobileNumber: z.string().regex(/^[6-9]\d{9}$/).optional(),
  alternateContactNumber: z.string().regex(/^[6-9]\d{9}$/).optional().or(z.literal('')),
  residentialAddress: z.string().min(10).max(500).optional(),
  pinCode: z.string().regex(/^\d{6}$/).optional(),

  // C. Professional Details
  organization: z.string().min(2).max(100).optional(),
  designation: z.string().min(2).max(100).optional(),
  industry: IndustryEnum.optional(),
  linkedinUrl: z
    .string()
    .url()
    .regex(/linkedin\.com/)
    .optional()
    .or(z.literal('')),

  // D. Event-Specific Details
  attendanceType: AttendanceTypeEnum.optional(),
  daysAttending: z.array(daysAttendingOptions).min(1).optional(),
  sessionsInterested: z.array(sessionOptions).min(1).optional(),
  accommodationRequired: z.boolean().or(z.string().transform((val) => val === 'true')).optional(),
  mealPreference: MealPreferenceEnum.optional(),
  tshirtSize: TShirtSizeEnum.optional(),

  // F. Emergency Details
  emergencyContactName: z.string().min(2).max(100).optional(),
  emergencyContactNumber: z.string().regex(/^[6-9]\d{9}$/).optional(),
  emergencyRelationship: z.string().min(2).max(50).optional(),

  // G. Consent & Verification
  termsAccepted: z.boolean().optional(),
  photoVideoConsent: z.boolean().optional(),
  dataPrivacyAgreement: z.boolean().optional(),

  // H. Optional Analytics
  heardAboutEvent: HeardAboutEventEnum.optional(),
  volunteerInterest: z.boolean().optional().or(z.string().transform((val) => val === 'true')),
  areasOfInterest: z.array(areasOfInterestOptions).optional(),
});

// Query parameters schema for filtering
export const queryAttendeesSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
  industry: IndustryEnum.optional(),
  attendanceType: AttendanceTypeEnum.optional(),
  registrationStatus: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'WAITLISTED']).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  search: z.string().optional(), // Search by name, email, or mobile
});

export type CreateAttendeeInput = z.infer<typeof createAttendeeSchema>;
export type UpdateAttendeeInput = z.infer<typeof updateAttendeeSchema>;
export type QueryAttendeesInput = z.infer<typeof queryAttendeesSchema>;
