export enum CallType {
    AUDIO = 'audio',
    VIDEO = 'video'
}

export enum CallStatus {
    INITIATED = 'initiated',
    RINGING = 'ringing',
    CONNECTED = 'connected',
    REJECTED = 'rejected',
    MISSED = 'missed',
    ENDED = 'ended'
}

export enum ParticipantStatus {
    DISCONNECTED = 'disconnected',
    CONNECTED = 'connected',
    INVITED = 'invited'
}

export interface User {
    id: number;
    email: string;
}

export interface CallMetadata {
    iceServers?: string[];
    sdpOffer?: string;
    sdpAnswer?: string;
    iceCandidates?: string[];
    channelId?: string;
    serverId?: string;
}

export interface Call {
    id: string;
    type: CallType;
    status: CallStatus;
    initiator_id: number;
    room_id: string;
    start_time: Date | null;
    end_time?: Date | null;
    duration?: number | null;
    metadata?: CallMetadata | null;
    created_at: Date;
    updated_at: Date;
}

export interface CallParticipant {
    id: number;
    call_id: string;
    user_id: number;
    status: ParticipantStatus;
    call_type: CallType;
    joined_at: Date | null;
    left_at?: Date | null;
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
    id: number;
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