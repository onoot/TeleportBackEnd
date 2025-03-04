import { Entity, Column } from 'typeorm';

@Entity('servers')
export class Server {
    @Column({ nullable: true })
    icon?: string;
} 