import { Pool } from 'pg';
import { config } from '../config';

const createCallsTableQuery = `
CREATE TABLE IF NOT EXISTS calls (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    caller_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    room_id VARCHAR(255) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS calls_caller_id_idx ON calls(caller_id);
CREATE INDEX IF NOT EXISTS calls_receiver_id_idx ON calls(receiver_id);
CREATE INDEX IF NOT EXISTS calls_status_idx ON calls(status);
`;

const createCallParticipantsTableQuery = `
CREATE TABLE IF NOT EXISTS call_participants (
    id SERIAL PRIMARY KEY,
    call_id INTEGER REFERENCES calls(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL,
    left_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS call_participants_call_id_idx ON call_participants(call_id);
CREATE INDEX IF NOT EXISTS call_participants_user_id_idx ON call_participants(user_id);
CREATE INDEX IF NOT EXISTS call_participants_status_idx ON call_participants(status);
`;

const dropFunctionQuery = 'DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;';

const createFunctionQuery = `
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

const createTriggersQuery = `
CREATE TRIGGER update_calls_updated_at
    BEFORE UPDATE ON calls
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_call_participants_updated_at
    BEFORE UPDATE ON call_participants
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
`;

interface PostgresError extends Error {
    position?: string;
    query?: string;
}

// Функция для проверки существования базы данных
async function checkDatabaseExists(dbName: string): Promise<boolean> {
    const client = new Pool({
        host: config.postgres.host,
        port: config.postgres.port,
        user: config.postgres.user,
        password: config.postgres.password,
        database: 'postgres'
    });

    try {
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
    const client = new Pool({
        host: config.postgres.host,
        port: config.postgres.port,
        user: config.postgres.user,
        password: config.postgres.password,
        database: 'postgres'
    });

    try {
        await client.query(`CREATE DATABASE ${dbName}`);
        console.log(`Database ${dbName} created successfully`);
    } finally {
        await client.end();
    }
}

// Функция для инициализации базы данных
export async function initializeDatabase(): Promise<void> {
    try {
        // Проверяем существование базы данных
        const dbExists = await checkDatabaseExists(config.postgres.database);
        if (!dbExists) {
            console.log(`Database ${config.postgres.database} does not exist, creating...`);
            await createDatabase(config.postgres.database);
        }

        // Создаем новый пул для работы с нашей базой данных
        const appPool = new Pool({
            host: config.postgres.host,
            port: config.postgres.port,
            database: config.postgres.database,
            user: config.postgres.user,
            password: config.postgres.password
        });

        console.log('Creating calls table...');
        await appPool.query(createCallsTableQuery);
        console.log('Calls table created successfully');

        console.log('Creating call participants table...');
        await appPool.query(createCallParticipantsTableQuery);
        console.log('Call participants table created successfully');

        console.log('Database initialization completed successfully');
        await appPool.end();
    } catch (error) {
        console.error('Error during database initialization:', error);
        throw error;
    }
}

// Запускаем инициализацию если скрипт запущен напрямую
if (require.main === module) {
    initializeDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
} 