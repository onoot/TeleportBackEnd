import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from './User';

@Entity('blocked_users')
@Unique(['user_id', 'blocked_user_id'])
export class BlockedUser {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  user_id!: number;

  @Column()
  blocked_user_id!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'blocked_user_id' })
  blocked_user!: User;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;
} 