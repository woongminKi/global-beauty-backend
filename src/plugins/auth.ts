import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { Session, User } from '../models/index.js';
import type { SessionUser } from '../utils/helpers.js';

declare module 'fastify' {
  interface FastifyRequest {
    getCurrentUser: () => Promise<SessionUser | null>;
  }
}

async function getUserFromSession(
  sessionToken: string | undefined
): Promise<SessionUser | null> {
  if (!sessionToken) {
    return null;
  }

  const session = await Session.findOne({
    token: sessionToken,
    expiresAt: { $gt: new Date() },
    revokedAt: { $exists: false },
  });

  if (!session) {
    return null;
  }

  const user = await User.findById(session.userId).lean();

  if (!user) {
    return null;
  }

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    locale: user.locale,
    profileImage: user.profileImage,
  };
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('getCurrentUser', async function () {
    return null;
  });

  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    request.getCurrentUser = () => getUserFromSession(request.cookies.session);
  });
};

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['@fastify/cookie'],
});
