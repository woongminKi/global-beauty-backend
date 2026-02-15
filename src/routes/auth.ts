import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { User, Session } from '../models/index.js';
import { generateSessionToken, getSessionExpiration } from '../utils/helpers.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /v1/auth/google/start - Start Google OAuth flow
  fastify.get('/google/start', async (request, reply) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:4000'}/v1/auth/google/callback`;

    if (!clientId) {
      return reply.status(500).send({
        success: false,
        error: 'Google OAuth not configured',
      });
    }

    // Generate state for CSRF protection
    const state = generateSessionToken().slice(0, 32);

    // Store state in cookie for verification
    reply.setCookie('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

    return reply.redirect(authUrl);
  });

  // GET /v1/auth/google/callback - Google OAuth callback
  fastify.get('/google/callback', async (request, reply) => {
    const querySchema = z.object({
      code: z.string(),
      state: z.string(),
    });

    const query = querySchema.parse(request.query);
    const { code, state } = query;

    // Verify state
    const storedState = request.cookies.oauth_state;
    if (!storedState || storedState !== state) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid state parameter',
      });
    }

    // Clear state cookie
    reply.clearCookie('oauth_state');

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:4000'}/v1/auth/google/callback`;

    if (!clientId || !clientSecret) {
      return reply.status(500).send({
        success: false,
        error: 'Google OAuth not configured',
      });
    }

    try {
      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = (await tokenResponse.json()) as { access_token?: string };

      if (!tokenResponse.ok) {
        fastify.log.error({ tokenData }, 'Token exchange failed');
        return reply.status(400).send({
          success: false,
          error: 'Failed to exchange code for tokens',
        });
      }

      // Get user info
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      const userInfo = (await userInfoResponse.json()) as {
        email: string;
        name: string;
        id: string;
        picture?: string;
      };

      if (!userInfoResponse.ok) {
        return reply.status(400).send({
          success: false,
          error: 'Failed to get user info',
        });
      }

      // Upsert user
      let user = await User.findOne({ email: userInfo.email });

      if (!user) {
        user = new User({
          email: userInfo.email,
          name: userInfo.name,
          provider: 'google',
          providerId: userInfo.id,
          profileImage: userInfo.picture,
          locale: 'en',
        });
        await user.save();
      } else if (user.provider === 'guest') {
        // Upgrade guest to Google user
        user.provider = 'google';
        user.providerId = userInfo.id;
        user.name = userInfo.name;
        user.profileImage = userInfo.picture;
        await user.save();
      }

      // Create session
      const sessionToken = generateSessionToken();
      const session = new Session({
        userId: user._id,
        userType: 'user',
        token: sessionToken,
        expiresAt: getSessionExpiration(7),
        userAgent: request.headers['user-agent'],
        ipAddress: request.ip,
      });
      await session.save();

      // Set session cookie
      reply.setCookie('session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });

      // Redirect to frontend
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return reply.redirect(`${frontendUrl}/en?login=success`);
    } catch (error) {
      fastify.log.error({ err: error }, 'Google OAuth error');
      return reply.status(500).send({
        success: false,
        error: 'Authentication failed',
      });
    }
  });

  // POST /v1/auth/logout - Logout
  fastify.post('/logout', async (request, reply) => {
    const sessionToken = request.cookies.session;

    if (sessionToken) {
      // Revoke session
      await Session.updateOne({ token: sessionToken }, { revokedAt: new Date() });
    }

    reply.clearCookie('session');

    return reply.send({
      success: true,
      message: 'Logged out successfully',
    });
  });

  // GET /v1/me - Get current user
  fastify.get('/me', async (request, reply) => {
    const sessionToken = request.cookies.session;

    if (!sessionToken) {
      return reply.status(401).send({
        success: false,
        error: 'Not authenticated',
      });
    }

    const session = await Session.findOne({
      token: sessionToken,
      expiresAt: { $gt: new Date() },
      revokedAt: { $exists: false },
    });

    if (!session) {
      reply.clearCookie('session');
      return reply.status(401).send({
        success: false,
        error: 'Session expired',
      });
    }

    const user = await User.findById(session.userId).lean();

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: 'User not found',
      });
    }

    return reply.send({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        locale: user.locale,
        profileImage: user.profileImage,
      },
    });
  });
};

export default authRoutes;
