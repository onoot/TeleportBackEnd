import { Repository, DataSource, FindOptionsWhere, IsNull } from 'typeorm';
import { Call, CallParticipant } from '../entities';
import { CallStatus, CallType, ParticipantStatus } from '../types';
import { AppDataSource } from '../data-source';

export { Call, CallType, CallStatus, CallParticipant, ParticipantStatus };

export class CallModel {
    constructor(private readonly dataSource: DataSource) {}

    async createCall(roomId: string, initiatorId: number, type: CallType): Promise<Call> {
        const call = new Call();
        call.room_id = roomId;
        call.initiator_id = initiatorId;
        call.type = type;
        call.status = CallStatus.INITIATED;
        return this.dataSource.manager.save(call);
    }

    async getCallById(id: string): Promise<Call | null> {
        return this.dataSource.manager.findOne(Call, {
            where: { id }
        });
    }

    async getCallParticipant(callId: string, userId: number): Promise<CallParticipant | null> {
        return this.dataSource.manager.findOne(CallParticipant, {
            where: { call_id: callId, user_id: userId }
        });
    }

    async getCallParticipantByUserId(userId: number): Promise<CallParticipant | null> {
        return this.dataSource.manager.findOne(CallParticipant, {
            where: { user_id: userId, left_at: IsNull() }
        });
    }

    async createCallParticipant(callId: string, userId: number, status: ParticipantStatus, callType: CallType): Promise<CallParticipant> {
        const participant = new CallParticipant();
        participant.call_id = callId;
        participant.user_id = userId;
        participant.status = status;
        participant.call_type = callType;
        return this.dataSource.manager.save(participant);
    }

    async updateCallParticipant(participant: CallParticipant): Promise<CallParticipant> {
        return this.dataSource.manager.save(participant);
    }

    async getActiveCallParticipants(callId: string): Promise<CallParticipant[]> {
        return this.dataSource.manager.find(CallParticipant, {
            where: { call_id: callId, left_at: IsNull() }
        });
    }

    async updateCall(call: Call): Promise<Call> {
        return this.dataSource.manager.save(call);
    }
}

export const CallModelClass = new CallModel(AppDataSource); 