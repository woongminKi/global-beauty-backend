import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { BookingRequest, Clinic } from '../models/index.js';
import type { Locale } from '../types/index.js';
import { sendBookingEmail, formatDateForEmail, formatPriceForEmail } from '../services/email.js';
import { requireOpsAuth } from '../plugins/ops-auth.js';

const opsRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply authentication to all ops routes
  fastify.addHook('preHandler', requireOpsAuth);

  // GET /v1/ops/booking-requests - Get booking queue
  fastify.get('/booking-requests', async (request, reply) => {
    const querySchema = z.object({
      status: z
        .enum([
          'received',
          'contactingHospital',
          'proposedOptions',
          'confirmed',
          'cancelled',
          'needsMoreInfo',
          'noAvailability',
        ])
        .optional(),
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(50),
    });

    const query = querySchema.parse(request.query);
    const { status, page, limit } = query;

    const filter: Record<string, unknown> = {};
    if (status) {
      filter.status = status;
    }

    const bookings = await BookingRequest.find(filter)
      .populate('clinicId', 'name city')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await BookingRequest.countDocuments(filter);

    // Calculate SLA status
    const now = new Date();
    const bookingsWithSla = bookings.map((b) => {
      const createdAt = new Date(b.createdAt);
      const hoursSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      const slaHours = 8; // 8 hours SLA

      return {
        ...b,
        sla: {
          hoursElapsed: Math.round(hoursSinceCreated * 10) / 10,
          hoursRemaining: Math.max(0, Math.round((slaHours - hoursSinceCreated) * 10) / 10),
          isOverdue: hoursSinceCreated > slaHours && b.status === 'received',
        },
      };
    });

    return reply.send({
      success: true,
      data: {
        items: bookingsWithSla,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  // POST /v1/ops/booking-requests/:id/status - Update booking status
  fastify.post('/booking-requests/:id/status', async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string(),
    });
    const bodySchema = z.object({
      status: z.enum([
        'received',
        'contactingHospital',
        'proposedOptions',
        'confirmed',
        'cancelled',
        'needsMoreInfo',
        'noAvailability',
      ]),
      note: z.string().optional(),
      proposedOptions: z
        .array(
          z.object({
            date: z.string().transform((s) => new Date(s)),
            timeSlot: z.string(),
            price: z.number(),
            note: z.string().optional(),
          })
        )
        .optional(),
      confirmedOption: z
        .object({
          date: z.string().transform((s) => new Date(s)),
          timeSlot: z.string(),
          price: z.number(),
        })
        .optional(),
    });

    const { id } = paramsSchema.parse(request.params);
    const data = bodySchema.parse(request.body);

    const booking = await BookingRequest.findById(id);
    if (!booking) {
      return reply.status(404).send({
        success: false,
        error: 'Booking request not found',
      });
    }

    // Update status
    booking.status = data.status;
    booking.statusHistory.push({
      status: data.status,
      changedAt: new Date(),
      note: data.note,
    });

    // Update proposed options if provided
    if (data.proposedOptions) {
      booking.proposedOptions = data.proposedOptions;
    }

    // Update confirmed option if provided
    if (data.confirmedOption) {
      booking.confirmedOption = data.confirmedOption;
    }

    await booking.save();

    // Send notification email for confirmed/cancelled status
    if (booking.guestEmail && (data.status === 'confirmed' || data.status === 'cancelled')) {
      const clinicDoc = await Clinic.findById(booking.clinicId).lean();
      const locale = (booking.locale || 'en') as Locale;
      const clinicName = clinicDoc?.name?.[locale] || clinicDoc?.name?.en || 'Unknown Clinic';

      const emailData = {
        to: booking.guestEmail,
        locale,
        accessCode: booking.accessCode,
        clinicName,
        procedure: booking.procedure,
        preferredDate: formatDateForEmail(booking.preferredDate, locale),
        confirmedDate: booking.confirmedOption?.date
          ? formatDateForEmail(booking.confirmedOption.date, locale)
          : undefined,
        confirmedTime: booking.confirmedOption?.timeSlot,
        confirmedPrice: booking.confirmedOption?.price
          ? formatPriceForEmail(booking.confirmedOption.price, booking.budget?.currency || 'KRW')
          : undefined,
        cancelReason: data.note,
      };

      const emailType = data.status === 'confirmed' ? 'bookingConfirmed' : 'bookingCancelled';

      sendBookingEmail(emailType, emailData).catch((err) => {
        fastify.log.error(`Failed to send ${emailType} email:`, err);
      });
    }

    return reply.send({
      success: true,
      data: {
        id: booking._id,
        status: booking.status,
        message: `Status updated to ${data.status}`,
      },
    });
  });

  // POST /v1/ops/booking-requests/:id/message - Send message to user
  fastify.post('/booking-requests/:id/message', async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string(),
    });
    const bodySchema = z.object({
      template: z.enum(['received', 'contacting', 'options', 'confirmed', 'cancelled']),
      customMessage: z.string().optional(),
    });

    const { id } = paramsSchema.parse(request.params);
    const data = bodySchema.parse(request.body);

    const booking = await BookingRequest.findById(id).populate('clinicId', 'name');
    if (!booking) {
      return reply.status(404).send({
        success: false,
        error: 'Booking request not found',
      });
    }

    // TODO: Implement actual email/SMS sending
    // For now, just log and return success

    fastify.log.info(
      `Sending ${data.template} message to ${booking.guestEmail || booking.guestPhone}`
    );

    return reply.send({
      success: true,
      data: {
        message: `Message sent successfully`,
        template: data.template,
        recipient: booking.guestEmail || booking.guestPhone,
      },
    });
  });

  // GET /v1/ops/stats - Get dashboard stats
  fastify.get('/stats', async (request, reply) => {
    const stats = await BookingRequest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statusCounts = stats.reduce(
      (acc, { _id, count }) => {
        acc[_id] = count;
        return acc;
      },
      {} as Record<string, number>
    );

    // Calculate conversion rate
    const totalRequests =
      (statusCounts.confirmed || 0) +
      (statusCounts.cancelled || 0) +
      (statusCounts.received || 0) +
      (statusCounts.contactingHospital || 0) +
      (statusCounts.proposedOptions || 0);

    const conversionRate =
      totalRequests > 0 ? ((statusCounts.confirmed || 0) / totalRequests) * 100 : 0;

    return reply.send({
      success: true,
      data: {
        statusCounts,
        totalRequests,
        conversionRate: Math.round(conversionRate * 10) / 10,
        pending: (statusCounts.received || 0) + (statusCounts.contactingHospital || 0),
      },
    });
  });
};

export default opsRoutes;
