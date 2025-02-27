import 'reflect-metadata';
import { Service } from 'typedi';
import { Room } from '../entities/Room';
import { RoomParticipant } from '../entities/RoomParticipant';
import { AppDataSource } from '../data-source';
import { v4 as uuidv4 } from 'uuid';
import { UserService } from './UserService';
import { DeepPartial } from 'typeorm';

@Service()
export class RoomService {
    private roomRepository = AppDataSource.getRepository(Room);
    private participantRepository = AppDataSource.getRepository(RoomParticipant);
    private userService: UserService;

    constructor() {
        this.userService = new UserService();
    }

    async createRoom(name: string, ownerId: number): Promise<Room> {
        const roomData: DeepPartial<Room> = {
            name,
            created_by: ownerId,
            invite_code: uuidv4(),
            is_active: true
        };

        const room = this.roomRepository.create(roomData);
        await this.roomRepository.save(room);

        const participantData: DeepPartial<RoomParticipant> = {
            room_id: room.id,
            user_id: ownerId,
            is_admin: true,
            joined_at: new Date()
        };

        const participant = this.participantRepository.create(participantData);
        await this.participantRepository.save(participant);

        return room;
    }

    async createPrivateRoom(initiatorId: number, targetId: number): Promise<Room> {
        const name = `Private Room ${initiatorId}-${targetId}`;
        const room = await this.createRoom(name, initiatorId);
        await this.addParticipant(room.id, targetId);
        return room;
    }

    async joinRoomByInvite(inviteCode: string, userId: number): Promise<Room> {
        const room = await this.roomRepository.findOne({
            where: { invite_code: inviteCode }
        });

        if (!room) {
            throw new Error('Комната не найдена');
        }

        const existingParticipant = await this.participantRepository.findOne({
            where: {
                room_id: room.id,
                user_id: userId
            }
        });

        if (existingParticipant) {
            throw new Error('Пользователь уже является участником комнаты');
        }

        await this.addParticipant(room.id, userId);
        return room;
    }

    async leaveRoom(roomId: string, userId: string): Promise<void> {
        const room = await this.roomRepository.findOne({
            where: { id: roomId },
            relations: ['participants']
        });
        if (!room) {
            throw new Error('Room not found');
        }

        const participantIndex = room.participants.findIndex(p => p.user_id === parseInt(userId));
        if (participantIndex === -1) {
            throw new Error('User not in room');
        }

        room.participants[participantIndex].left_at = new Date();
        
        if (room.participants.every(p => p.left_at)) {
            room.is_active = false;
        }
        
        await this.roomRepository.save(room);
    }

    async getRoomParticipants(roomId: string): Promise<any[]> {
        const room = await this.roomRepository.findOne({
            where: { id: roomId },
            relations: ['participants']
        });
        if (!room) {
            throw new Error('Room not found');
        }

        const userIds = room.participants
            .filter(p => !p.left_at)
            .map(p => p.user_id);
            
        return this.userService.getUsersInfo(userIds);
    }

    async getRoomById(roomId: string): Promise<Room | null> {
        return this.roomRepository.findOne({
            where: { id: roomId },
            relations: ['participants']
        });
    }

    async getRoomsByUserId(userId: number): Promise<Room[]> {
        const participants = await this.participantRepository.find({
            where: { user_id: userId },
            relations: ['room']
        });

        return participants.map(p => p.room);
    }

    async isRoomParticipant(roomId: string, userId: number): Promise<boolean> {
        const room = await this.getRoomById(roomId);
        return room?.participants.some(p => 
            p.user_id === userId && !p.left_at
        ) || false;
    }

    async addParticipant(roomId: string, userId: number, isAdmin: boolean = false): Promise<RoomParticipant> {
        const participantData: DeepPartial<RoomParticipant> = {
            room_id: roomId,
            user_id: userId,
            is_admin: isAdmin,
            joined_at: new Date()
        };

        const participant = this.participantRepository.create(participantData);
        const savedParticipant = await this.participantRepository.save(participant);
        return savedParticipant;
    }

    async removeParticipant(roomId: string, userId: number): Promise<void> {
        await this.participantRepository.delete({
            room_id: roomId,
            user_id: userId
        });
    }

    async generateInvite(roomId: string): Promise<string> {
        const inviteCode = uuidv4();
        await this.roomRepository.update(roomId, {
            invite_code: inviteCode,
            updated_at: new Date()
        });
        return inviteCode;
    }
} 