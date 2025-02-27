import { Schema, model } from 'mongoose';

const CallSchema = new Schema({
  room_id: Schema.Types.ObjectId,
  initiator_id: Number, // ID пользователя из PostgreSQL
  type: {
    type: String,
    enum: ['audio', 'video']
  },
  status: {
    type: String,
    enum: ['initiated', 'connected', 'ended', 'rejected']
  },
  participants: [{
    user_id: Number, // ID пользователя из PostgreSQL
    status: {
      type: String,
      enum: ['invited', 'connected', 'disconnected']
    },
    call_type: {
      type: String,
      enum: ['audio', 'video']
    },
    joined_at: Date,
    left_at: Date
  }],
  start_time: Date,
  end_time: Date,
  duration: Number
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export const Call = model('Call', CallSchema); 