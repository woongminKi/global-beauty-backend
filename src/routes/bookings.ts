import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { BookingRequest, Clinic } from '../models/index.js';
import { generateAccessCode } from '../utils/helpers.js';

const bookingsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /v1/booking-requests/my-requests - Get all bookings for a user
  // - Logged in user: returns all bookings by userId or email
  // - Guest: requires email + accessCode
  fastify.get('/my-requests', async (request, reply) => {
    const querySchema = z.object({
      email: z.string().email().optional(),
      accessCode: z.string().min(1).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(10),
      status: z.string().optional(),
    });

    const { email, accessCode, page, limit, status } = querySchema.parse(request.query);

    // Check if user is logged in
    const currentUser = await request.getCurrentUser();

    let query: Record<string, unknown> = {};

    if (currentUser) {
      // Logged-in user: get bookings by userId OR their email
      query = {
        $or: [
          { userId: currentUser.id },
          { guestEmail: currentUser.email.toLowerCase() },
        ],
      };
    } else {
      // Guest: require email + accessCode
      if (!email || !accessCode) {
        return reply.status(401).send({
          success: false,
          error: 'Authentication required. Please provide email and accessCode, or login.',
        });
      }

      // Verify that email + accessCode combination exists
      const authBooking = await BookingRequest.findOne({
        guestEmail: email.toLowerCase(),
        accessCode: accessCode,
      });

      if (!authBooking) {
        return reply.status(401).send({
          success: false,
          error: 'Invalid email or access code',
        });
      }

      query = { guestEmail: email.toLowerCase() };
    }

    // Add status filter if provided
    if (status) {
      query.status = status;
    }

    // Get total count
    const total = await BookingRequest.countDocuments(query);

    // Get paginated results
    const bookings = await BookingRequest.find(query)
      .populate('clinicId', 'name address phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const items = bookings.map((booking) => ({
      _id: booking._id,
      clinic: booking.clinicId,
      procedure: booking.procedure,
      preferredDate: booking.preferredDate,
      preferredTimeSlot: booking.preferredTimeSlot,
      status: booking.status,
      accessCode: booking.accessCode,
      createdAt: booking.createdAt,
      confirmedOption: booking.confirmedOption,
    }));

    return reply.send({
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  // POST /v1/booking-requests - Create booking request
  fastify.post('/', async (request, reply) => {
    const bodySchema = z.object({
      clinicId: z.string(),
      procedure: z.string().min(1),
      preferredDate: z.string().transform((s) => new Date(s)),
      preferredTimeSlot: z.string().optional(),
      budget: z
        .object({
          min: z.number().optional(),
          max: z.number().optional(),
          currency: z.enum(['KRW', 'USD', 'JPY', 'CNY']).default('KRW'),
        })
        .optional(),
      guestEmail: z.string().email().optional(),
      guestPhone: z.string().optional(),
      photos: z.array(z.string()).optional(),
      locale: z.enum(['en', 'ja', 'zh']).default('en'),
      notes: z.string().optional(),
    });

    const data = bodySchema.parse(request.body);

    // Verify clinic exists
    const clinic = await Clinic.findById(data.clinicId);
    if (!clinic) {
      return reply.status(404).send({
        success: false,
        error: 'Clinic not found',
      });
    }

    // Check if user is logged in
    const currentUser = await request.getCurrentUser();

    // Determine email to use
    const email = currentUser?.email || data.guestEmail;

    // Require at least email or phone
    if (!email && !data.guestPhone) {
      return reply.status(400).send({
        success: false,
        error: 'Either email or phone is required',
      });
    }

    // Generate access code
    const accessCode = generateAccessCode();

    // Create booking request
    const bookingRequest = new BookingRequest({
      clinicId: data.clinicId,
      userId: currentUser?.id || undefined, // Attach user ID if logged in
      guestEmail: email?.toLowerCase(),
      guestPhone: data.guestPhone,
      accessCode,
      procedure: data.procedure,
      preferredDate: data.preferredDate,
      preferredTimeSlot: data.preferredTimeSlot,
      budget: data.budget || {},
      photos: data.photos || [],
      locale: data.locale,
      notes: data.notes,
      status: 'received',
      statusHistory: [
        {
          status: 'received',
          changedAt: new Date(),
        },
      ],
    });

    await bookingRequest.save();

    // TODO: Send confirmation email/notification

    return reply.status(201).send({
      success: true,
      data: {
        id: bookingRequest._id,
        accessCode: bookingRequest.accessCode,
        status: bookingRequest.status,
        message: 'Booking request received. We will contact you soon.',
      },
    });
  });

  // GET /v1/booking-requests/:id - Get booking request status
  fastify.get('/:id', async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string(),
    });
    const querySchema = z.object({
      accessCode: z.string().optional(),
    });

    const { id } = paramsSchema.parse(request.params);
    const { accessCode } = querySchema.parse(request.query);

    const booking = await BookingRequest.findById(id)
      .populate('clinicId', 'name address phone')
      .lean();

    if (!booking) {
      return reply.status(404).send({
        success: false,
        error: 'Booking request not found',
      });
    }

    // Check authorization
    const currentUser = await request.getCurrentUser();
    const isOwner =
      currentUser &&
      (booking.userId?.toString() === currentUser.id ||
        booking.guestEmail === currentUser.email.toLowerCase());
    const hasValidAccessCode = accessCode && booking.accessCode === accessCode;

    if (!isOwner && !hasValidAccessCode) {
      return reply.status(403).send({
        success: false,
        error: 'Access denied. Please provide a valid access code or login.',
      });
    }

    return reply.send({
      success: true,
      data: {
        id: booking._id,
        clinic: booking.clinicId,
        procedure: booking.procedure,
        preferredDate: booking.preferredDate,
        preferredTimeSlot: booking.preferredTimeSlot,
        budget: booking.budget,
        notes: booking.notes,
        status: booking.status,
        statusHistory: booking.statusHistory,
        proposedOptions: booking.proposedOptions,
        confirmedOption: booking.confirmedOption,
        accessCode: booking.accessCode,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      },
    });
  });
};

export default bookingsRoutes;
