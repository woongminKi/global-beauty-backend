import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { Session, OpsUser } from '../models/index.js';

export interface OpsSessionUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'operator';
}

declare module 'fastify' {
  interface FastifyRequest {
    getOpsUser: () => Promise<OpsSessionUser | null>;
  }
}

async function getOpsUserFromSession(
  sessionToken: string | undefined
): Promise<OpsSessionUser | null> {
  if (!sessionToken) return null;

  const session = await Session.findOne({
    token: sessionToken,
    userType: 'ops',
    expiresAt: { $gt: new Date() },
    revokedAt: { $exists: false },
  });

  if (!session) return null;

  const user = await OpsUser.findById(session.userId);
  if (!user || !user.isActive) return null;

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

const opsAuthPlugin: FastifyPluginAsync = async (fastify) => {
  // Decorate request with getOpsUser function
  fastify.decorateRequest('getOpsUser', async function () {
    return null;
  });

  // Add hook to populate getOpsUser
  fastify.addHook('onRequest', async (request) => {
    request.getOpsUser = () => getOpsUserFromSession(request.cookies.ops_session);
  });
};

// Middleware to require ops authentication
export async function requireOpsAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = await request.getOpsUser();
  if (!user) {
    reply.status(401).send({
      success: false,
      error: 'Authentication required',
    });
  }
}

// Middleware to require admin role
export async function requireOpsAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = await request.getOpsUser();
  if (!user) {
    reply.status(401).send({
      success: false,
      error: 'Authentication required',
    });
    return;
  }
  if (user.role !== 'admin') {
    reply.status(403).send({
      success: false,
      error: 'Admin access required',
    });
  }
}

export default fp(opsAuthPlugin);
