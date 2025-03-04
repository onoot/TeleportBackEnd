import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
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
} 