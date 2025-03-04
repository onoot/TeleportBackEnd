import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserStatus, UserSettings } from '../types/user';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  username!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ nullable: true })
  avatar: string | null = null;

  @Column({ type: 'enum', enum: ['online', 'offline'] as const, default: 'offline' })
  status: UserStatus = 'offline';

  @Column({ 
    type: 'jsonb', 
    default: { 
      notifications: true, 
      theme: 'light', 
      language: 'ru' 
    } 
  })
  settings: UserSettings = {};

  @Column({ default: false })
  email_verified: boolean = false;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  last_seen: Date = new Date();

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date = new Date();

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date = new Date();
} 