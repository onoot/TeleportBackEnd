import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Server } from './Server';
import { Role } from './Role';

export enum MemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member'
}

@Entity('server_members')
export class ServerMember {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  user_id!: number;

  @Column()
  server_id!: number;

  @Column({
    type: 'enum',
    enum: MemberRole,
    default: MemberRole.MEMBER
  })
  role!: MemberRole;

  @Column({ nullable: true })
  nickname?: string;

  @ManyToOne(() => Server, server => server.members)
  server!: Server;

  @ManyToMany(() => Role)
  @JoinTable({
    name: 'server_member_roles',
    joinColumn: {
      name: 'member_id',
      referencedColumnName: 'id'
    },
    inverseJoinColumn: {
      name: 'role_id',
      referencedColumnName: 'id'
    }
  })
  roles!: Role[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at!: Date;
} 