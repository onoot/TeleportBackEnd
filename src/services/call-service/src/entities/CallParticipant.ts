import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Call } from './Call';
import { CallType, ParticipantStatus } from '../types';

@Entity('call_participants')
export class CallParticipant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'call_id', type: 'uuid' })
  call_id!: string;

  @Column({ name: 'user_id', type: 'integer' })
  user_id!: number;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    enum: ParticipantStatus,
    default: ParticipantStatus.INVITED
  })
  status!: ParticipantStatus;

  @Column({
    name: 'call_type',
    type: 'varchar',
    length: 10,
    enum: CallType,
    default: CallType.AUDIO
  })
  call_type!: CallType;

  @Column({ name: 'audio_enabled', type: 'boolean', default: true })
  audio_enabled!: boolean;

  @Column({ name: 'video_enabled', type: 'boolean', default: false })
  video_enabled!: boolean;

  @Column({ name: 'joined_at', type: 'timestamp with time zone', nullable: true })
  joined_at!: Date | null;

  @Column({ name: 'left_at', type: 'timestamp with time zone', nullable: true })
  left_at!: Date | null;

  @ManyToOne(() => Call, call => call.participants)
  @JoinColumn({ name: 'call_id' })
  call!: Call;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;

  constructor() {
    this.id = '';
    this.call_id = '';
    this.user_id = 0;
    this.status = ParticipantStatus.INVITED;
    this.call_type = CallType.AUDIO;
    this.audio_enabled = true;
    this.video_enabled = false;
    this.joined_at = null;
    this.left_at = null;
    this.call = new Call();
    this.created_at = new Date();
    this.updated_at = new Date();
  }
} 