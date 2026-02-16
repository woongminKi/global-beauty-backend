import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import mongodbPlugin from './plugins/mongodb.js';
import authPlugin from './plugins/auth.js';
import opsAuthPlugin from './plugins/ops-auth.js';
import clinicsRoutes from './routes/clinics.js';
import bookingsRoutes from './routes/bookings.js';
import opsRoutes from './routes/ops.js';
import opsAuthRoutes from './routes/ops-auth.js';
import authRoutes from './routes/auth.js';

const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  },
});

// Register plugins
await fastify.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
});

await fastify.register(cookie, {
  secret: process.env.SESSION_SECRET || 'change-this-secret-in-production',
});

// Auth helpers
await fastify.register(authPlugin); // provides request.getCurrentUser
await fastify.register(opsAuthPlugin); // provides request.getOpsUser

// Swagger documentation
await fastify.register(swagger, {
  openapi: {
    info: {
      title: 'Global Beauty API',
      description: 'API for Global Beauty medical tourism platform',
      version: '1.0.0',
    },
    servers: [
      {
        url: process.env.BACKEND_URL || 'http://localhost:4000',
        description: 'Development server',
      },
    ],
  },
});

await fastify.register(swaggerUi, {
  routePrefix: '/docs',
});

// Database connection
await fastify.register(mongodbPlugin);

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// API routes
await fastify.register(clinicsRoutes, { prefix: '/v1/clinics' });
await fastify.register(bookingsRoutes, { prefix: '/v1/booking-requests' });
await fastify.register(opsAuthRoutes, { prefix: '/v1/ops/auth' });
await fastify.register(opsRoutes, { prefix: '/v1/ops' });
await fastify.register(authRoutes, { prefix: '/v1/auth' });

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);

  // Zod validation error
  if (error instanceof Error && error.name === 'ZodError') {
    return reply.status(400).send({
      success: false,
      error: 'Validation error',
      details: (error as unknown as { issues: unknown[] }).issues,
    });
  }

  // Default error
  const statusCode = (error as { statusCode?: number }).statusCode || 500;
  const message = error instanceof Error ? error.message : 'Internal server error';
  return reply.status(statusCode).send({
    success: false,
    error: message,
  });
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '4000', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    fastify.log.info(`Server running at http://localhost:${port}`);
    fastify.log.info(`API docs available at http://localhost:${port}/docs`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
