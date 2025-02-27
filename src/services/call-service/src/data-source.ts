import { DataSource } from 'typeorm';
import { config } from './config';
import { Call } from './entities/Call';
import { CallParticipant } from './entities/CallParticipant';
import { Room } from './entities/Room';
import { RoomParticipant } from './entities/RoomParticipant';
import { CreateTablesInitial1709192400000 } from './migrations/1709192400000-CreateTablesInitial';
import { Client } from 'pg';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.postgres.host,
  port: config.postgres.port,
  username: config.postgres.user,
  password: config.postgres.password,
  database: config.postgres.database,
  synchronize: true,
  logging: false,
  entities: [Call, CallParticipant, Room, RoomParticipant],
  migrations: [CreateTablesInitial1709192400000],
  subscribers: []
});

// Функция для проверки существования базы данных
async function checkDatabaseExists(dbName: string): Promise<boolean> {
  const client = new Client({
    host: config.postgres.host,
    port: config.postgres.port,
    user: config.postgres.user,
    password: config.postgres.password,
    database: 'postgres'
  });

  try {
    await client.connect();
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );
    return (result.rowCount ?? 0) > 0;
  } finally {
    await client.end();
  }
}

// Функция для создания базы данных
async function createDatabase(dbName: string): Promise<void> {
  const client = new Client({
    host: config.postgres.host,
    port: config.postgres.port,
    user: config.postgres.user,
    password: config.postgres.password,
    database: 'postgres'
  });

  try {
    await client.connect();
    await client.query(`CREATE DATABASE ${dbName}`);
    console.log(`Database ${dbName} created successfully`);
  } finally {
    await client.end();
  }
}

// Функция для создания функции автообновления updated_at
async function createUpdateTimestampFunction(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        IF row(NEW.*) IS DISTINCT FROM row(OLD.*) THEN
            NEW.updated_at = CURRENT_TIMESTAMP;
        END IF;
        RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);
}

// Функция для создания триггеров
async function createUpdateTriggers(dataSource: DataSource): Promise<void> {
  const tables = ['rooms', 'room_participants', 'calls', 'call_participants'];
  for (const table of tables) {
    try {
      await dataSource.query(`
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
        CREATE TRIGGER update_${table}_updated_at
            BEFORE UPDATE ON ${table}
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
      `);
      console.log(`Created trigger for table ${table}`);
    } catch (error) {
      console.error(`Error handling trigger for ${table}:`, error);
    }
  }
}

// Функция для инициализации подключения к базе данных
export const initializeDataSource = async () => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('Data Source has been initialized!');
    }
    return AppDataSource;
  } catch (error) {
    console.error('Error during initialization:', error);
    throw error;
  }
}; 