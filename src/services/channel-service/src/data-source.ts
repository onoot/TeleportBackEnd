import { DataSource } from 'typeorm';
import { config } from './config';
import { Server } from './entities/Server';
import { Category } from './entities/Category';
import { Channel } from './entities/Channel';
import { ServerMember } from './entities/ServerMember';
import { Role } from './entities/Role';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: config.database.synchronize,
  logging: config.database.logging,
  entities: [Server, Category, Channel, ServerMember, Role],
  migrations: [],
  subscribers: []
});

export async function initializeDataSource() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('Data Source has been initialized!');
    }
    return AppDataSource;
  } catch (error) {
    console.error('Error during Data Source initialization:', error);
    throw error;
  }
} 