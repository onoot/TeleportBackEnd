import { Repository, IsNull } from 'typeorm';
import { Room } from '../entities/Room';
import { RoomParticipant } from '../entities/RoomParticipant';
import { AppDataSource } from '../data-source';

export { Room, RoomParticipant };

export class RoomModelClass {
    private roomRepository: Repository<Room>;
    private participantRepository: Repository<RoomParticipant>;

    constructor() {
        this.roomRepository = AppDataSource.getRepository(Room);
        this.participantRepository = AppDataSource.getRepository(RoomParticipant);
    }

    async createRoom(createdBy: number, name?: string): Promise<Room> {
        const room = new Room();
        room.created_by = createdBy;
        if (name) {
            room.name = name;
        }
        room.is_active = true;
        room.invite_code = Math.random().toString(36).substring(7);
        return await this.roomRepository.save(room);
    }

    async findRoomById(roomId: string): Promise<Room | null> {
        return await this.roomRepository.findOne({
            where: { id: roomId }
        });
    }

    async addParticipant(roomId: string, userId: number, isAdmin: boolean = false): Promise<RoomParticipant> {
        const participant = new RoomParticipant();
        participant.room_id = roomId;
        participant.user_id = userId;
        participant.is_admin = isAdmin;
        participant.joined_at = new Date();
        return await this.participantRepository.save(participant);
    }

    async removeParticipant(roomId: string, userId: number): Promise<void> {
        const participant = await this.participantRepository.findOne({
            where: { room_id: roomId, user_id: userId }
        });
        if (participant) {
            participant.left_at = new Date();
            await this.participantRepository.save(participant);
        }
    }

    async isRoomParticipant(roomId: string, userId: number): Promise<boolean> {
        const participant = await this.participantRepository.findOne({
            where: { room_id: roomId, user_id: userId, left_at: IsNull() }
        });
        return !!participant;
    }

    async getRoomParticipants(roomId: string): Promise<RoomParticipant[]> {
        return await this.participantRepository.find({
            where: { room_id: roomId, left_at: IsNull() }
        });
    }

    async deactivateRoom(roomId: string): Promise<void> {
        const room = await this.findRoomById(roomId);
        if (room) {
            room.is_active = false;
            await this.roomRepository.save(room);
        }
    }
}

export const RoomModel = new RoomModelClass(); 