import { FastifyPluginAsync } from 'fastify';
import mongoose from 'mongoose';

const mongodbPlugin: FastifyPluginAsync = async (fastify) => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI environment variable is required');
  }

  try {
    await mongoose.connect(uri);
    fastify.log.info('Connected to MongoDB');

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      fastify.log.error({ err }, 'MongoDB connection error');
    });

    mongoose.connection.on('disconnected', () => {
      fastify.log.warn('MongoDB disconnected');
    });

    // Graceful shutdown
    fastify.addHook('onClose', async () => {
      await mongoose.connection.close();
      fastify.log.info('MongoDB connection closed');
    });
  } catch (error) {
    fastify.log.error({ err: error }, 'Failed to connect to MongoDB');
    throw error;
  }
};

export default mongodbPlugin;
