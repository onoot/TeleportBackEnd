export enum CallType {
  AUDIO = 'audio',
  VIDEO = 'video'
}

export enum CallStatus {
  INITIATED = 'initiated',
  CONNECTED = 'connected',
  ENDED = 'ended',
  REJECTED = 'rejected'
}

export enum ParticipantStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  INVITED = 'invited',
  PENDING = 'pending',
  REJECTED = 'rejected'
}

export interface Call {
  id: string;
  room_id: string;
  initiator_id: number;
  type: CallType;
  status: CallStatus;
  start_time?: Date;
  end_time?: Date;
  duration?: number;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface CallParticipant {
  id: string;
  call_id: string;
  user_id: number;
  status: ParticipantStatus;
  call_type: CallType;
  joined_at: Date | null;
  left_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Room {
  id: string;
  name?: string;
  created_by: number;
  invite_code: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RoomParticipant {
  id: string;
  room_id: string;
  user_id: number;
  is_admin: boolean;
  joined_at: Date;
  left_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate';
  payload: any;
  from: number;
  to: number;
  roomId: string;
}

export interface JwtPayload {
    id: number;
    email: string;
    iat?: number;
    exp?: number;
} 