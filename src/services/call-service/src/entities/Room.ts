import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { RoomParticipant } from './RoomParticipant';
import { Call } from './Call';

@Entity('rooms')
export class Room {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    name!: string | null;

    @Column({ name: 'created_by', type: 'integer' })
    created_by!: number;

    @Column({ name: 'invite_code', unique: true })
    invite_code!: string;

    @Column({ name: 'is_active', default: true })
    is_active!: boolean;

    @OneToMany(() => RoomParticipant, participant => participant.room)
    participants!: RoomParticipant[];

    @OneToMany(() => Call, call => call.room)
    calls!: Call[];

    @CreateDateColumn({ name: 'created_at' })
    created_at!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updated_at!: Date;

    constructor() {
        this.id = '';
        this.name = null;
        this.created_by = 0;
        this.invite_code = '';
        this.is_active = true;
        this.participants = [];
        this.calls = [];
        this.created_at = new Date();
        this.updated_at = new Date();
    }
} 