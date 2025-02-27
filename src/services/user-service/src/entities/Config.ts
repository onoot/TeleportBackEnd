import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('config')
export class Config {
  @PrimaryColumn()
  key!: string;

  @Column()
  value!: string;

  @Column({ nullable: true })
  description?: string;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at!: Date;
} 