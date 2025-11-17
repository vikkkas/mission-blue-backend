import prisma from '../config/database';
import s3Service from './s3.service';
import { CreateAttendeeInput, UpdateAttendeeInput, QueryAttendeesInput } from '../schemas/attendee.schema';

export class AttendeeService {
  /**
   * Create new attendee registration for authenticated user
   */
  async createAttendee(
    userId: string,
    data: CreateAttendeeInput,
    files?: {
      photoUpload?: Express.Multer.File[];
      idProofUpload?: Express.Multer.File[];
      studentIdUpload?: Express.Multer.File[];
    }
  ) {
    // Check if user already has an attendee registration
    const existingAttendee = await prisma.attendee.findUnique({
      where: { userId },
    });

    if (existingAttendee) {
      throw new Error('You have already submitted a registration. Please update your existing registration instead.');
    }

    // Upload files to S3
    let photoUploadUrl: string | undefined;
    let idProofUploadUrl: string | undefined;
    let studentIdUploadUrl: string | undefined;

    try {
      if (files?.photoUpload?.[0]) {
        photoUploadUrl = await s3Service.uploadPhoto(files.photoUpload[0]);
      }

      if (files?.idProofUpload?.[0]) {
        idProofUploadUrl = await s3Service.uploadIdProof(files.idProofUpload[0]);
      }

      if (files?.studentIdUpload?.[0]) {
        studentIdUploadUrl = await s3Service.uploadStudentId(files.studentIdUpload[0]);
      }

      // Create attendee in database linked to user
      const attendee = await prisma.attendee.create({
        data: {
          userId,
          
          // Personal Information
          fullName: data.fullName,
          dateOfBirth: new Date(data.dateOfBirth),
          gender: data.gender,
          nationality: data.nationality,
          documentNumber: data.documentNumber,

          // Contact Information
          mobileNumber: data.mobileNumber,
          alternateContactNumber: data.alternateContactNumber || null,
          residentialAddress: data.residentialAddress,
          pinCode: data.pinCode,

          // Professional Details
          organization: data.organization,
          designation: data.designation,
          industry: data.industry,
          linkedinUrl: data.linkedinUrl || null,

          // Event-Specific Details
          attendanceType: data.attendanceType,
          daysAttending: data.daysAttending,
          sessionsInterested: data.sessionsInterested,
          accommodationRequired: data.accommodationRequired,
          mealPreference: data.mealPreference,
          tshirtSize: data.tshirtSize,

          // Uploaded files
          photoUploadUrl,
          idProofUploadUrl,
          studentIdUploadUrl,

          // Emergency Details
          emergencyContactName: data.emergencyContactName,
          emergencyContactNumber: data.emergencyContactNumber,
          emergencyRelationship: data.emergencyRelationship,

          // Consent & Verification
          termsAccepted: data.termsAccepted,
          photoVideoConsent: data.photoVideoConsent,
          dataPrivacyAgreement: data.dataPrivacyAgreement,

          // Optional Analytics
          heardAboutEvent: data.heardAboutEvent,
          volunteerInterest: data.volunteerInterest || false,
          areasOfInterest: data.areasOfInterest || [],

          // Set initial status (form submitted, payment pending)
          registrationStatus: 'PENDING',
          paymentStatus: 'PENDING',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              mobile: true,
              name: true,
            },
          },
        },
      });

      return attendee;
    } catch (error) {
      // Cleanup uploaded files if database creation fails
      const uploadedUrls = [photoUploadUrl, idProofUploadUrl, studentIdUploadUrl].filter(
        (url): url is string => !!url
      );
      if (uploadedUrls.length > 0) {
        await s3Service.deleteFiles(uploadedUrls);
      }
      throw error;
    }
  }

  /**
   * Get all attendees with filtering and pagination
   */
  async getAllAttendees(query: QueryAttendeesInput) {
    const { page = 1, limit = 10, industry, attendanceType, registrationStatus, fromDate, toDate, search } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (industry) {
      where.industry = industry;
    }

    if (attendanceType) {
      where.attendanceType = attendanceType;
    }

    if (registrationStatus) {
      where.registrationStatus = registrationStatus;
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = new Date(fromDate);
      }
      if (toDate) {
        where.createdAt.lte = new Date(toDate);
      }
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { mobileNumber: { contains: search } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { mobile: { contains: search } } },
      ];
    }

    // Get total count
    const total = await prisma.attendee.count({ where });

    // Get paginated results
    const attendees = await prisma.attendee.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            mobile: true,
            name: true,
            isVerified: true,
          },
        },
      },
    });

    return {
      attendees,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get attendee by ID
   */
  async getAttendeeById(id: string) {
    const attendee = await prisma.attendee.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            mobile: true,
            name: true,
            isVerified: true,
          },
        },
      },
    });

    if (!attendee) {
      throw new Error('Attendee not found');
    }

    return attendee;
  }

  /**
   * Update attendee
   */
  async updateAttendee(
    id: string,
    data: UpdateAttendeeInput,
    files?: {
      photoUpload?: Express.Multer.File[];
      idProofUpload?: Express.Multer.File[];
      studentIdUpload?: Express.Multer.File[];
    }
  ) {
    // Check if attendee exists
    const existingAttendee = await this.getAttendeeById(id);

    const oldFileUrls: string[] = [];

    // Upload new files if provided
    let photoUploadUrl = existingAttendee.photoUploadUrl;
    let idProofUploadUrl = existingAttendee.idProofUploadUrl;
    let studentIdUploadUrl = existingAttendee.studentIdUploadUrl;

    if (files?.photoUpload?.[0]) {
      if (existingAttendee.photoUploadUrl) {
        oldFileUrls.push(existingAttendee.photoUploadUrl);
      }
      photoUploadUrl = await s3Service.uploadPhoto(files.photoUpload[0]);
    }

    if (files?.idProofUpload?.[0]) {
      if (existingAttendee.idProofUploadUrl) {
        oldFileUrls.push(existingAttendee.idProofUploadUrl);
      }
      idProofUploadUrl = await s3Service.uploadIdProof(files.idProofUpload[0]);
    }

    if (files?.studentIdUpload?.[0]) {
      if (existingAttendee.studentIdUploadUrl) {
        oldFileUrls.push(existingAttendee.studentIdUploadUrl);
      }
      studentIdUploadUrl = await s3Service.uploadStudentId(files.studentIdUpload[0]);
    }

    // Update attendee in database
    const updatedAttendee = await prisma.attendee.update({
      where: { id },
      data: {
        ...(data.fullName && { fullName: data.fullName }),
        ...(data.dateOfBirth && { dateOfBirth: new Date(data.dateOfBirth) }),
        ...(data.gender && { gender: data.gender }),
        ...(data.nationality && { nationality: data.nationality }),
        ...(data.documentNumber !== undefined && { documentNumber: data.documentNumber }),
        ...(data.mobileNumber && { mobileNumber: data.mobileNumber }),
        ...(data.alternateContactNumber !== undefined && {
          alternateContactNumber: data.alternateContactNumber || null,
        }),
        ...(data.residentialAddress && { residentialAddress: data.residentialAddress }),
        ...(data.pinCode && { pinCode: data.pinCode }),
        ...(data.organization && { organization: data.organization }),
        ...(data.designation && { designation: data.designation }),
        ...(data.industry && { industry: data.industry }),
        ...(data.linkedinUrl !== undefined && { linkedinUrl: data.linkedinUrl || null }),
        ...(data.attendanceType && { attendanceType: data.attendanceType }),
        ...(data.daysAttending && { daysAttending: data.daysAttending }),
        ...(data.sessionsInterested && { sessionsInterested: data.sessionsInterested }),
        ...(data.accommodationRequired !== undefined && {
          accommodationRequired: data.accommodationRequired,
        }),
        ...(data.mealPreference && { mealPreference: data.mealPreference }),
        ...(data.tshirtSize && { tshirtSize: data.tshirtSize }),
        ...(photoUploadUrl !== existingAttendee.photoUploadUrl && { photoUploadUrl }),
        ...(idProofUploadUrl !== existingAttendee.idProofUploadUrl && { idProofUploadUrl }),
        ...(studentIdUploadUrl !== existingAttendee.studentIdUploadUrl && { studentIdUploadUrl }),
        ...(data.emergencyContactName && { emergencyContactName: data.emergencyContactName }),
        ...(data.emergencyContactNumber && { emergencyContactNumber: data.emergencyContactNumber }),
        ...(data.emergencyRelationship && { emergencyRelationship: data.emergencyRelationship }),
        ...(data.termsAccepted !== undefined && { termsAccepted: data.termsAccepted }),
        ...(data.photoVideoConsent !== undefined && { photoVideoConsent: data.photoVideoConsent }),
        ...(data.dataPrivacyAgreement !== undefined && {
          dataPrivacyAgreement: data.dataPrivacyAgreement,
        }),
        ...(data.heardAboutEvent !== undefined && { heardAboutEvent: data.heardAboutEvent }),
        ...(data.volunteerInterest !== undefined && { volunteerInterest: data.volunteerInterest }),
        ...(data.areasOfInterest && { areasOfInterest: data.areasOfInterest }),
      },
    });

    // Delete old files from S3
    if (oldFileUrls.length > 0) {
      await s3Service.deleteFiles(oldFileUrls);
    }

    // Fetch updated attendee with user data
    const attendeeWithUser = await prisma.attendee.findUnique({
      where: { id: updatedAttendee.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            mobile: true,
            name: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return attendeeWithUser!;
  }

  /**
   * Delete attendee
   */
  async deleteAttendee(id: string, deleteFiles = true) {
    const attendee = await this.getAttendeeById(id);

    // Delete from database
    await prisma.attendee.delete({
      where: { id },
    });

    // Delete files from S3 if requested
    if (deleteFiles) {
      const fileUrls = [
        attendee.photoUploadUrl,
        attendee.idProofUploadUrl,
        attendee.studentIdUploadUrl,
      ].filter((url): url is string => !!url);

      if (fileUrls.length > 0) {
        await s3Service.deleteFiles(fileUrls);
      }
    }

    return attendee;
  }

  /**
   * Get attendee statistics
   */
  async getStatistics() {
    const [
      total,
      confirmed,
      pending,
      cancelled,
      inPersonCount,
      virtualCount,
      accommodationCount,
    ] = await Promise.all([
      prisma.attendee.count(),
      prisma.attendee.count({ where: { registrationStatus: 'CONFIRMED' } }),
      prisma.attendee.count({ where: { registrationStatus: 'PENDING' } }),
      prisma.attendee.count({ where: { registrationStatus: 'CANCELLED' } }),
      prisma.attendee.count({ where: { attendanceType: 'IN_PERSON' } }),
      prisma.attendee.count({ where: { attendanceType: 'VIRTUAL' } }),
      prisma.attendee.count({ where: { accommodationRequired: true } }),
    ]);

    return {
      total,
      byStatus: {
        confirmed,
        pending,
        cancelled,
      },
      byAttendanceType: {
        inPerson: inPersonCount,
        virtual: virtualCount,
      },
      accommodationRequired: accommodationCount,
    };
  }

  /**
   * Get attendee registration for current user
   */
  async getMyRegistration(userId: string) {
    const attendee = await prisma.attendee.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            mobile: true,
            name: true,
            isVerified: true,
          },
        },
      },
    });

    return attendee;
  }

  /**
   * Update payment status (admin only or payment gateway webhook)
   */
  async updatePaymentStatus(
    attendeeId: string,
    paymentData: {
      paymentStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
      paymentId?: string;
      paymentAmount?: number;
    }
  ) {
    const attendee = await prisma.attendee.update({
      where: { id: attendeeId },
      data: {
        paymentStatus: paymentData.paymentStatus,
        ...(paymentData.paymentId && { paymentId: paymentData.paymentId }),
        ...(paymentData.paymentAmount && { paymentAmount: paymentData.paymentAmount }),
        ...(paymentData.paymentStatus === 'COMPLETED' && {
          paymentDate: new Date(),
          registrationStatus: 'CONFIRMED', // Auto-confirm on successful payment
        }),
      },
    });

    return attendee;
  }
}

export default new AttendeeService();
