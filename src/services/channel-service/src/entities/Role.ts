import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Server } from './Server';

export enum DefaultRole {
  OWNER = 'owner',
  MEMBER = 'member'
}

export enum Permission {
  MANAGE_SERVER = 'manage_server',
  MANAGE_CHANNELS = 'manage_channels',
  MANAGE_CATEGORIES = 'manage_categories',
  MANAGE_ROLES = 'manage_roles',
  MANAGE_MEMBERS = 'manage_members',
  KICK_MEMBERS = 'kick_members',
  BAN_MEMBERS = 'ban_members',
  MODERATE_MESSAGES = 'moderate_messages',
  VIEW_AUDIT_LOG = 'view_audit_log',
  MENTION_EVERYONE = 'mention_everyone',
  CREATE_INVITES = 'create_invites',
  VIEW_CHANNELS = 'view_channels',
  SEND_MESSAGES = 'send_messages',
  CONNECT_VOICE = 'connect_voice'
}

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  server_id!: number;

  @Column({
    type: 'enum',
    enum: DefaultRole,
    nullable: true
  })
  default_role?: DefaultRole;

  @Column('simple-array')
  permissions!: Permission[];

  @Column({ default: false })
  is_deletable!: boolean;

  @Column({ type: 'int', default: 0 })
  position!: number;

  @ManyToOne(() => Server, server => server.roles)
  server!: Server;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at!: Date;
} 