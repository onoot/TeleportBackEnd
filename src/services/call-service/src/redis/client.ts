import Redis from 'ioredis';
import { redisConfig } from '../config';

console.log('Initializing Redis client with config:', {
  ...redisConfig,
  password: '***'
});

const redisClient = new Redis(redisConfig);

let isConnected = false;

redisClient.on('connect', () => {
  console.log('Redis client connected successfully');
  isConnected = true;
});

redisClient.on('ready', () => {
  console.log('Redis client ready to accept commands');
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
  isConnected = false;
});

redisClient.on('close', () => {
  console.log('Redis connection closed');
  isConnected = false;
});

redisClient.on('reconnecting', () => {
  console.log('Redis client reconnecting...');
});

redisClient.on('end', () => {
  console.log('Redis connection ended');
  isConnected = false;
});

export const getRedisClient = async () => {
  if (!isConnected) {
    console.log('Waiting for Redis connection...');
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Redis connection timeout'));
      }, 30000);

      const cleanup = () => {
        clearTimeout(timeout);
        redisClient.removeListener('connect', handleConnect);
        redisClient.removeListener('error', handleError);
      };

      const handleConnect = () => {
        cleanup();
        resolve();
      };

      const handleError = (err: Error) => {
        cleanup();
        reject(err);
      };

      redisClient.once('connect', handleConnect);
      redisClient.once('error', handleError);
    });
  }
  return redisClient;
};

export { redisClient }; 