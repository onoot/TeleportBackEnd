import mongoose from 'mongoose';
import { config } from '../config';

export async function initializeMongo() {
  try {
    await mongoose.connect(config.mongodb.uri);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
} 