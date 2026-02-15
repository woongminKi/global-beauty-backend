import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { PipelineStage } from 'mongoose';
import { Clinic } from '../models/index.js';
import type { City } from '../types/index.js';

const clinicsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /v1/clinics - Search clinics
  fastify.get('/', async (request, reply) => {
    const querySchema = z.object({
      city: z.enum(['seoul', 'busan', 'jeju']).optional(),
      tags: z.string().optional(), // comma-separated
      q: z.string().optional(), // keyword search
      sort: z.enum(['rating', 'reviewCount', 'distance', 'name']).default('rating'),
      lat: z.coerce.number().optional(),
      lng: z.coerce.number().optional(),
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(50).default(20),
    });

    const query = querySchema.parse(request.query);
    const { city, tags, q, sort, lat, lng, page, limit } = query;

    // Build filter
    const filter: Record<string, unknown> = { isActive: true };

    if (city) {
      filter.city = city;
    }

    if (tags) {
      const tagList = tags.split(',').map((t) => t.trim());
      filter.tags = { $in: tagList };
    }

    if (q) {
      filter.$text = { $search: q };
    }

    // Build sort
    let sortOption: Record<string, 1 | -1> = {};
    switch (sort) {
      case 'rating':
        sortOption = { rating: -1 };
        break;
      case 'reviewCount':
        sortOption = { reviewCount: -1 };
        break;
      case 'name':
        sortOption = { 'name.en': 1 };
        break;
      default:
        sortOption = { rating: -1 };
    }

    // Geo query for distance sorting
    let clinics;
    let total;

    if (sort === 'distance' && lat && lng) {
      // Use aggregation for geo sorting
      const pipeline: PipelineStage[] = [
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [lng, lat] },
            distanceField: 'distance',
            query: filter,
            spherical: true,
          },
        },
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ];

      clinics = await Clinic.aggregate(pipeline);
      total = await Clinic.countDocuments(filter);
    } else {
      clinics = await Clinic.find(filter)
        .sort(sortOption)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      total = await Clinic.countDocuments(filter);
    }

    return reply.send({
      success: true,
      data: {
        items: clinics,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  // GET /v1/clinics/:id - Get clinic detail
  fastify.get('/:id', async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string(),
    });

    const { id } = paramsSchema.parse(request.params);

    const clinic = await Clinic.findById(id).lean();

    if (!clinic) {
      return reply.status(404).send({
        success: false,
        error: 'Clinic not found',
      });
    }

    return reply.send({
      success: true,
      data: clinic,
    });
  });

  // GET /v1/clinics/:id/reviews - Get clinic reviews (placeholder)
  fastify.get('/:id/reviews', async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string(),
    });

    const { id } = paramsSchema.parse(request.params);

    const clinic = await Clinic.findById(id).select('externalReviewLinks').lean();

    if (!clinic) {
      return reply.status(404).send({
        success: false,
        error: 'Clinic not found',
      });
    }

    // For MVP, return external review links
    // Self-hosted reviews will be added in Phase 2
    return reply.send({
      success: true,
      data: {
        externalLinks: clinic.externalReviewLinks || [],
        reviews: [], // Placeholder for self-hosted reviews
      },
    });
  });
};

export default clinicsRoutes;
