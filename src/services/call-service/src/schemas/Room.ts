import { Schema, model } from 'mongoose';

const RoomSchema = new Schema({
  name: String,
  created_by: Number, // ID пользователя из PostgreSQL
  invite_code: { type: String, unique: true },
  is_active: { type: Boolean, default: true },
  participants: [{
    user_id: Number, // ID пользователя из PostgreSQL
    is_admin: Boolean,
    joined_at: Date,
    left_at: Date
  }]
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export const Room = model('Room', RoomSchema); 