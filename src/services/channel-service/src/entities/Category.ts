import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Server } from './Server';
import { Channel } from './Channel';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  position!: number;

  @Column()
  server_id!: number;

  @ManyToOne(() => Server, server => server.categories)
  server!: Server;

  @OneToMany(() => Channel, channel => channel.category)
  channels!: Channel[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at!: Date;
} 