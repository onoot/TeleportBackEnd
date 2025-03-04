import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Category } from './Category';
import { Role } from './Role';
import { ServerMember } from './ServerMember';

@Entity('servers')
export class Server {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  icon_url?: string;

  @Column()
  owner_id!: string;

  @OneToMany(() => Category, category => category.server)
  categories!: Category[];

  @OneToMany(() => Role, role => role.server)
  roles!: Role[];

  @OneToMany(() => ServerMember, member => member.server)
  members!: ServerMember[];
} 