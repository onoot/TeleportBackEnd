import { DataSource } from 'typeorm';
import { config } from '../config';
import { User } from './entities/User';
import { Friendship } from './entities/Friendship';
import { BlockedUser } from './entities/BlockedUser';
import { Config } from './entities/Config';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.database.host.split(':')[0],
  port: parseInt(config.database.host.split(':')[1] || '5432'),
  username: config.database.username,
  password: config.database.password || '',
  database: config.database.database,
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV !== 'production',
  entities: [User, Friendship, BlockedUser, Config],
  migrations: [],
  subscribers: []
});

export async function initializeDataSource() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('Data Source has been initialized!');

      // Проверяем существование таблиц
      const queryRunner = AppDataSource.createQueryRunner();
      const tables = ['users', 'friendships', 'blocked_users', 'config'];
      
      for (const table of tables) {
        const tableExists = await queryRunner.hasTable(table);
        if (!tableExists) {
          console.log(`Table ${table} does not exist, synchronizing...`);
          await AppDataSource.synchronize();
          break;
        }
      }
      
      await queryRunner.release();
    }
    return AppDataSource;
  } catch (error) {
    console.error('Error during Data Source initialization:', error);
    throw error;
  }
} 