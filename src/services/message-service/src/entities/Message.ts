import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { MessageType, MessageStatus } from '../models/MessageModel';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.DIRECT
  })
  type!: MessageType;

  @Column('uuid')
  senderId!: string;

  @Column('uuid', { nullable: true })
  recipientId?: string;

  @Column('uuid')
  channelId!: string;

  @Column('uuid', { nullable: true })
  serverId?: string;

  @Column('text')
  content!: string;

  @Column('uuid', { nullable: true })
  replyTo?: string;

  @Column('simple-array', { default: [] })
  attachments!: string[];

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.SENT
  })
  status!: MessageStatus;

  @Column('jsonb', { default: {} })
  reactions!: { [emoji: string]: string[] };

  @Column('boolean', { default: false })
  isDeleted!: boolean;

  @Column('boolean', { default: false })
  edited!: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  editedAt!: Date;
} 