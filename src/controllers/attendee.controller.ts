import { Response } from 'express';
import attendeeService from '../services/attendee.service';
import {
  createAttendeeSchema,
  updateAttendeeSchema,
  queryAttendeesSchema,
} from '../schemas/attendee.schema';
import { AuthRequest } from '../middleware/auth.middleware';

export class AttendeeController {
  /**
   * Create new attendee (authenticated user fills the registration form)
   * POST /api/v1/attendees
   */
  async create(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Validate request body
      const validatedData = createAttendeeSchema.parse(req.body);

      // Create attendee with file uploads for the authenticated user
      const attendee = await attendeeService.createAttendee(
        req.user.id,
        validatedData,
        req.files as {
          photoUpload?: Express.Multer.File[];
          idProofUpload?: Express.Multer.File[];
          studentIdUpload?: Express.Multer.File[];
        }
      );

      return res.status(201).json({
        success: true,
        message: 'Registration form submitted successfully. Please complete payment to confirm your registration.',
        data: {
          id: attendee.id,
          fullName: attendee.fullName,
          registrationStatus: attendee.registrationStatus,
          paymentStatus: attendee.paymentStatus,
          createdAt: attendee.createdAt,
        },
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.errors,
        });
      }

      if (error.message?.includes('already submitted')) {
        return res.status(409).json({
          success: false,
          message: error.message,
        });
      }

      throw error;
    }
  }

  /**
   * Get my registration (current authenticated user)
   * GET /api/v1/attendees/me
   */
  async getMyRegistration(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const attendee = await attendeeService.getMyRegistration(req.user.id);

      if (!attendee) {
        return res.status(404).json({
          success: false,
          message: 'No registration found. Please fill the registration form first.',
        });
      }

      return res.json({
        success: true,
        message: 'Registration retrieved successfully',
        data: attendee,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all attendees with filtering and pagination (Admin only)
   * GET /api/v1/attendees
   */
  async getAll(req: AuthRequest, res: Response) {
    try {
      const query = queryAttendeesSchema.parse(req.query);
      const result = await attendeeService.getAllAttendees(query);

      return res.json({
        success: true,
        message: 'Attendees retrieved successfully',
        data: result.attendees,
        pagination: result.pagination,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: error.errors,
        });
      }
      throw error;
    }
  }

  /**
   * Get attendee by ID (Admin only)
   * GET /api/v1/attendees/:id
   */
  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const attendee = await attendeeService.getAttendeeById(id);

      return res.json({
        success: true,
        message: 'Attendee retrieved successfully',
        data: attendee,
      });
    } catch (error: any) {
      if (error.message === 'Attendee not found') {
        return res.status(404).json({
          success: false,
          message: 'Attendee not found',
        });
      }
      throw error;
    }
  }

  /**
   * Update my attendee registration (current user)
   * PUT /api/v1/attendees/me
   */
  async updateMyRegistration(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Get user's attendee record
      const existingAttendee = await attendeeService.getMyRegistration(req.user.id);
      
      if (!existingAttendee) {
        return res.status(404).json({
          success: false,
          message: 'No registration found. Please submit the registration form first.',
        });
      }

      const validatedData = updateAttendeeSchema.parse(req.body);

      const attendee = await attendeeService.updateAttendee(
        existingAttendee.id,
        validatedData,
        req.files as {
          photoUpload?: Express.Multer.File[];
          idProofUpload?: Express.Multer.File[];
          studentIdUpload?: Express.Multer.File[];
        }
      );

      return res.json({
        success: true,
        message: 'Registration updated successfully',
        data: attendee,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.errors,
        });
      }

      if (error.message === 'Attendee not found') {
        return res.status(404).json({
          success: false,
          message: 'Attendee not found',
        });
      }

      throw error;
    }
  }

  /**
   * Delete attendee (Admin only)
   * DELETE /api/v1/attendees/:id
   */
  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { deleteFiles } = req.query;

      const attendee = await attendeeService.deleteAttendee(
        id,
        deleteFiles !== 'false' // Default to true unless explicitly set to false
      );

      return res.json({
        success: true,
        message: 'Attendee deleted successfully',
        data: {
          id: attendee.id,
          fullName: attendee.fullName,
        },
      });
    } catch (error: any) {
      if (error.message === 'Attendee not found') {
        return res.status(404).json({
          success: false,
          message: 'Attendee not found',
        });
      }
      throw error;
    }
  }

  /**
   * Get registration statistics (Admin only)
   * GET /api/v1/attendees/stats
   */
  async getStatistics(_req: AuthRequest, res: Response) {
    try {
      const stats = await attendeeService.getStatistics();

      return res.json({
        success: true,
        message: 'Statistics retrieved successfully',
        data: stats,
      });
    } catch (error) {
      throw error;
    }
  }
}

export default new AttendeeController();
