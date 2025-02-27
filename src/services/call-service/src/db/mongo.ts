import mongoose from 'mongoose';
import { config } from '../config';

export async function initializeMongo(): Promise<void> {
  try {
    await mongoose.connect(config.mongodb.uri);
    console.log('Successfully connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
} 