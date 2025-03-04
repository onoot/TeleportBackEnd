import { DataSource } from 'typeorm';
import { Role } from './entities/Role';
import { Server } from './entities/Server';
import { ServerMember } from './entities/ServerMember';
import { Category } from './entities/Category';
import { Channel } from './entities/Channel';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'bexapaskey.beget.app',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'cloud_user',
  password: process.env.DB_PASSWORD || 'Md&7xKRB2RSn',
  database: process.env.DB_DATABASE || 'default_db',
  synchronize: true,
  logging: false,
  entities: [Role, Server, ServerMember, Category, Channel],
  migrations: [],
  subscribers: []
});

export async function initializeDataSource(): Promise<DataSource> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  return AppDataSource;
} 