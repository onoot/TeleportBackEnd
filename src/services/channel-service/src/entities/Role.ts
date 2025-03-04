import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany } from 'typeorm';
import { Server } from './Server';
import { ServerMember } from './ServerMember';
import { Permission, DefaultRole } from '../types/role';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column('text', { array: true })
  permissions!: Permission[];

  @Column()
  position!: number;

  @Column()
  server_id!: number;

  @Column({ default: true })
  is_deletable!: boolean;

  @Column({ type: 'enum', enum: DefaultRole, nullable: true })
  default_role?: DefaultRole;

  @ManyToOne(() => Server, server => server.roles)
  server!: Server;

  @ManyToMany(() => ServerMember, member => member.roles)
  members!: ServerMember[];
} 