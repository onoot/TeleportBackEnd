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
  avatar?: string | null;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.OFFLINE
  })
  status!: UserStatus;

  @Column({ 
    type: 'jsonb', 
    default: { 
      notifications: true, 
      theme: 'light', 
      language: 'ru' 
    } 
  })
  settings!: UserSettings;

  @Column({ default: false })
  email_verified!: boolean;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  last_seen!: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at!: Date;
} 