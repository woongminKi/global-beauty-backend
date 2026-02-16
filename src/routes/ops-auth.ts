import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { OpsUser, Session } from '../models/index.js';

const SESSION_EXPIRY_DAYS = 7;

const opsAuthRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /v1/ops/auth/login - Ops user login
  fastify.post('/login', async (request, reply) => {
    const bodySchema = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    });

    const { email, password } = bodySchema.parse(request.body);

    // Find user
    const user = await OpsUser.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return reply.status(401).send({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Create session
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

    await Session.create({
      userId: user._id,
      userType: 'ops',
      token: sessionToken,
      expiresAt,
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip,
    });

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Set cookie
    reply.setCookie('ops_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
    });

    return reply.send({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  });

  // POST /v1/ops/auth/logout - Ops user logout
  fastify.post('/logout', async (request, reply) => {
    const sessionToken = request.cookies.ops_session;

    if (sessionToken) {
      // Revoke session
      await Session.updateOne(
        { token: sessionToken, userType: 'ops' },
        { revokedAt: new Date() }
      );
    }

    // Clear cookie
    reply.clearCookie('ops_session', { path: '/' });

    return reply.send({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  });

  // GET /v1/ops/auth/me - Get current ops user
  fastify.get('/me', async (request, reply) => {
    const sessionToken = request.cookies.ops_session;

    if (!sessionToken) {
      return reply.status(401).send({
        success: false,
        error: 'Not authenticated',
      });
    }

    // Find valid session
    const session = await Session.findOne({
      token: sessionToken,
      userType: 'ops',
      expiresAt: { $gt: new Date() },
      revokedAt: { $exists: false },
    });

    if (!session) {
      reply.clearCookie('ops_session', { path: '/' });
      return reply.status(401).send({
        success: false,
        error: 'Session expired',
      });
    }

    // Find user
    const user = await OpsUser.findById(session.userId);
    if (!user || !user.isActive) {
      return reply.status(401).send({
        success: false,
        error: 'User not found or inactive',
      });
    }

    return reply.send({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  });

  // POST /v1/ops/auth/create-user - Create ops user (admin only, for seeding)
  fastify.post('/create-user', async (request, reply) => {
    const bodySchema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(1),
      role: z.enum(['admin', 'operator']).default('operator'),
      adminSecret: z.string(), // Simple protection for user creation
    });

    const { email, password, name, role, adminSecret } = bodySchema.parse(request.body);

    // Check admin secret
    if (adminSecret !== process.env.OPS_ADMIN_SECRET) {
      return reply.status(403).send({
        success: false,
        error: 'Invalid admin secret',
      });
    }

    // Check if user already exists
    const existingUser = await OpsUser.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return reply.status(400).send({
        success: false,
        error: 'User with this email already exists',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await OpsUser.create({
      email: email.toLowerCase(),
      name,
      passwordHash,
      role,
      isActive: true,
    });

    return reply.status(201).send({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  });
};

export default opsAuthRoutes;
