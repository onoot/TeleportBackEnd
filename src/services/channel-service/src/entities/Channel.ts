import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Category } from './Category';

export enum ChannelType {
  TEXT = 'text',
  VOICE = 'voice'
}

@Entity('channels')
export class Channel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({
    type: 'enum',
    enum: ChannelType,
    default: ChannelType.TEXT
  })
  type!: ChannelType;

  @Column()
  position!: number;

  @Column()
  category_id!: number;

  @Column({ nullable: true })
  room_id?: string;

  @ManyToOne(() => Category, category => category.channels)
  category!: Category;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at!: Date;
} 