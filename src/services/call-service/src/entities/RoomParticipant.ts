import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Room } from './Room';

@Entity('room_participants')
export class RoomParticipant {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: 'room_id', type: 'uuid' })
    room_id!: string;

    @Column({ name: 'user_id', type: 'integer' })
    user_id!: number;

    @Column({ name: 'is_admin', default: false })
    is_admin!: boolean;

    @Column({ name: 'joined_at', type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
    joined_at!: Date;

    @Column({ name: 'left_at', type: 'timestamp with time zone', nullable: true })
    left_at!: Date | null;

    @ManyToOne(() => Room, room => room.participants)
    @JoinColumn({ name: 'room_id' })
    room!: Room;

    @CreateDateColumn({ name: 'created_at' })
    created_at!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updated_at!: Date;

    constructor() {
        this.id = 0;
        this.room_id = '';
        this.user_id = 0;
        this.is_admin = false;
        this.joined_at = new Date();
        this.left_at = null;
        this.room = new Room();
        this.created_at = new Date();
        this.updated_at = new Date();
    }
} 