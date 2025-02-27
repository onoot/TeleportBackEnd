import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { CallStatus, CallType } from '../types';
import { CallParticipant } from './CallParticipant';
import { Room } from './Room';

@Entity('calls')
export class Call {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'room_id', type: 'uuid' })
    room_id!: string;

    @Column({ name: 'initiator_id', type: 'integer' })
    initiator_id!: number;

    @Column({
        type: 'varchar',
        length: 10,
        enum: CallType,
        default: CallType.AUDIO
    })
    type!: CallType;

    @Column({
        type: 'varchar',
        length: 20,
        enum: CallStatus,
        default: CallStatus.INITIATED
    })
    status!: CallStatus;

    @Column({ name: 'start_time', type: 'timestamp with time zone', nullable: true })
    start_time!: Date | null;

    @Column({ name: 'end_time', type: 'timestamp with time zone', nullable: true })
    end_time!: Date | null;

    @Column({ type: 'integer', nullable: true })
    duration!: number | null;

    @Column({ type: 'jsonb', nullable: true })
    metadata!: Record<string, any> | null;

    @ManyToOne(() => Room, room => room.calls)
    @JoinColumn({ name: 'room_id' })
    room!: Room;

    @OneToMany(() => CallParticipant, participant => participant.call)
    participants!: CallParticipant[];

    @CreateDateColumn({ name: 'created_at' })
    created_at!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updated_at!: Date;

    @Column({ type: 'timestamp', nullable: true })
    endedAt!: Date | null;

    constructor() {
        this.id = '';
        this.room_id = '';
        this.initiator_id = 0;
        this.type = CallType.AUDIO;
        this.status = CallStatus.INITIATED;
        this.start_time = null;
        this.end_time = null;
        this.duration = null;
        this.metadata = null;
        this.room = new Room();
        this.participants = [];
        this.created_at = new Date();
        this.updated_at = new Date();
        this.endedAt = null;
    }
} 