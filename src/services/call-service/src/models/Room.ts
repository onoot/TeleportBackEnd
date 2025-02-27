import mongoose from 'mongoose';

export interface IRoom {
  id: string;
  name: string;
  inviteCode: string;
  participants: string[];
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new mongoose.Schema<IRoom>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  inviteCode: { type: String, required: true, unique: true },
  participants: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

roomSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Room = mongoose.model<IRoom>('Room', roomSchema); 