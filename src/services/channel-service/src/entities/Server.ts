import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Category } from './Category';
import { ServerMember } from './ServerMember';
import { Role } from './Role';

@Entity('servers')
export class Server {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  icon?: string;

  @Column()
  owner_id!: number;

  @Column({ unique: true })
  invite_code!: string;

  @OneToMany(() => Category, category => category.server)
  categories!: Category[];

  @OneToMany(() => ServerMember, member => member.server)
  members!: ServerMember[];

  @OneToMany(() => Role, role => role.server)
  roles!: Role[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at!: Date;
} 