import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Review, BookingRequest, Clinic } from '../models/index.js';

const reviewsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /v1/reviews/clinic/:clinicId - Get reviews for a clinic
  fastify.get('/clinic/:clinicId', async (request, reply) => {
    const paramsSchema = z.object({
      clinicId: z.string(),
    });
    const querySchema = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(10),
      sort: z.enum(['recent', 'rating-high', 'rating-low', 'helpful']).default('recent'),
    });

    const { clinicId } = paramsSchema.parse(request.params);
    const { page, limit, sort } = querySchema.parse(request.query);

    // Build sort option
    let sortOption: Record<string, 1 | -1> = { createdAt: -1 };
    switch (sort) {
      case 'rating-high':
        sortOption = { rating: -1, createdAt: -1 };
        break;
      case 'rating-low':
        sortOption = { rating: 1, createdAt: -1 };
        break;
      case 'helpful':
        sortOption = { helpfulCount: -1, createdAt: -1 };
        break;
    }

    const filter = { clinicId, isVisible: true };

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('userId', 'name')
        .sort(sortOption)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
    ]);

    // Calculate rating distribution
    const ratingStats = await Review.aggregate([
      { $match: { clinicId: new (await import('mongoose')).default.Types.ObjectId(clinicId), isVisible: true } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
    ]);

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;
    ratingStats.forEach(({ _id, count }) => {
      ratingDistribution[_id] = count;
      totalRating += _id * count;
    });
    const averageRating = total > 0 ? totalRating / total : 0;

    return reply.send({
      success: true,
      data: {
        items: reviews.map((review) => ({
          _id: review._id,
          user: review.userId,
          rating: review.rating,
          title: review.title,
          content: review.content,
          procedure: review.procedure,
          visitDate: review.visitDate,
          photos: review.photos,
          isVerified: review.isVerified,
          helpfulCount: review.helpfulCount,
          createdAt: review.createdAt,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        stats: {
          averageRating: Math.round(averageRating * 10) / 10,
          totalReviews: total,
          ratingDistribution,
        },
      },
    });
  });

  // POST /v1/reviews - Create a review (requires login + confirmed booking)
  fastify.post('/', async (request, reply) => {
    const bodySchema = z.object({
      bookingId: z.string(),
      rating: z.number().int().min(1).max(5),
      title: z.string().min(1).max(100),
      content: z.string().min(10).max(2000),
      photos: z.array(z.string()).max(5).optional(),
    });

    const data = bodySchema.parse(request.body);

    // Check authentication
    const currentUser = await request.getCurrentUser();
    if (!currentUser) {
      return reply.status(401).send({
        success: false,
        error: 'Login required to write a review',
      });
    }

    // Find the booking
    const booking = await BookingRequest.findById(data.bookingId);
    if (!booking) {
      return reply.status(404).send({
        success: false,
        error: 'Booking not found',
      });
    }

    // Check if user owns this booking
    if (booking.userId?.toString() !== currentUser.id &&
        booking.guestEmail?.toLowerCase() !== currentUser.email.toLowerCase()) {
      return reply.status(403).send({
        success: false,
        error: 'You can only review your own bookings',
      });
    }

    // Check if booking is confirmed
    if (booking.status !== 'confirmed') {
      return reply.status(400).send({
        success: false,
        error: 'You can only review confirmed bookings',
      });
    }

    // Check if review already exists for this booking
    const existingReview = await Review.findOne({ bookingId: data.bookingId });
    if (existingReview) {
      return reply.status(400).send({
        success: false,
        error: 'You have already reviewed this booking',
      });
    }

    // Create review
    const review = await Review.create({
      clinicId: booking.clinicId,
      userId: currentUser.id,
      bookingId: booking._id,
      rating: data.rating,
      title: data.title,
      content: data.content,
      procedure: booking.procedure,
      visitDate: booking.confirmedOption?.date || booking.preferredDate,
      locale: booking.locale,
      photos: data.photos || [],
      isVerified: true,
      isVisible: true,
    });

    // Update clinic rating
    await updateClinicRating(booking.clinicId.toString());

    return reply.status(201).send({
      success: true,
      data: {
        id: review._id,
        message: 'Review submitted successfully',
      },
    });
  });

  // GET /v1/reviews/my-reviews - Get current user's reviews
  fastify.get('/my-reviews', async (request, reply) => {
    const currentUser = await request.getCurrentUser();
    if (!currentUser) {
      return reply.status(401).send({
        success: false,
        error: 'Login required',
      });
    }

    const reviews = await Review.find({ userId: currentUser.id })
      .populate('clinicId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return reply.send({
      success: true,
      data: {
        items: reviews.map((review) => ({
          _id: review._id,
          clinic: review.clinicId,
          rating: review.rating,
          title: review.title,
          content: review.content,
          procedure: review.procedure,
          visitDate: review.visitDate,
          photos: review.photos,
          createdAt: review.createdAt,
        })),
      },
    });
  });

  // GET /v1/reviews/can-review/:bookingId - Check if user can review a booking
  fastify.get('/can-review/:bookingId', async (request, reply) => {
    const paramsSchema = z.object({
      bookingId: z.string(),
    });

    const { bookingId } = paramsSchema.parse(request.params);

    const currentUser = await request.getCurrentUser();
    if (!currentUser) {
      return reply.send({
        success: true,
        data: { canReview: false, reason: 'Login required' },
      });
    }

    const booking = await BookingRequest.findById(bookingId);
    if (!booking) {
      return reply.send({
        success: true,
        data: { canReview: false, reason: 'Booking not found' },
      });
    }

    // Check ownership
    if (booking.userId?.toString() !== currentUser.id &&
        booking.guestEmail?.toLowerCase() !== currentUser.email.toLowerCase()) {
      return reply.send({
        success: true,
        data: { canReview: false, reason: 'Not your booking' },
      });
    }

    // Check status
    if (booking.status !== 'confirmed') {
      return reply.send({
        success: true,
        data: { canReview: false, reason: 'Booking must be confirmed' },
      });
    }

    // Check existing review
    const existingReview = await Review.findOne({ bookingId });
    if (existingReview) {
      return reply.send({
        success: true,
        data: { canReview: false, reason: 'Already reviewed' },
      });
    }

    return reply.send({
      success: true,
      data: { canReview: true },
    });
  });

  // POST /v1/reviews/:id/helpful - Mark review as helpful
  fastify.post('/:id/helpful', async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string(),
    });

    const { id } = paramsSchema.parse(request.params);

    const review = await Review.findByIdAndUpdate(
      id,
      { $inc: { helpfulCount: 1 } },
      { new: true }
    );

    if (!review) {
      return reply.status(404).send({
        success: false,
        error: 'Review not found',
      });
    }

    return reply.send({
      success: true,
      data: { helpfulCount: review.helpfulCount },
    });
  });
};

// Helper function to update clinic rating
async function updateClinicRating(clinicId: string) {
  const stats = await Review.aggregate([
    { $match: { clinicId: new (await import('mongoose')).default.Types.ObjectId(clinicId), isVisible: true } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await Clinic.findByIdAndUpdate(clinicId, {
      rating: Math.round(stats[0].avgRating * 10) / 10,
      reviewCount: stats[0].count,
    });
  }
}

export default reviewsRoutes;
