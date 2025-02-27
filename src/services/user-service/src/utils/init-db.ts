import { Pool } from 'pg';
import { config } from '../../config';

const createTableQuery = `
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    avatar VARCHAR(255),
    status VARCHAR(50) DEFAULT 'offline',
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    settings JSONB DEFAULT '{"notifications": true, "theme": "light", "language": "ru"}'::jsonb,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_status_idx ON users(status);
`;

const createFriendshipsTableQuery = `
CREATE TABLE IF NOT EXISTS friendships (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    friend_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, friend_id),
    CHECK (user_id != friend_id)
);

CREATE INDEX IF NOT EXISTS friendships_user_id_idx ON friendships(user_id);
CREATE INDEX IF NOT EXISTS friendships_friend_id_idx ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS friendships_status_idx ON friendships(status);
`;

const createBlockedUsersTableQuery = `
CREATE TABLE IF NOT EXISTS blocked_users (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, blocked_user_id),
    CHECK (user_id != blocked_user_id)
);

CREATE INDEX IF NOT EXISTS blocked_users_user_id_idx ON blocked_users(user_id);
CREATE INDEX IF NOT EXISTS blocked_users_blocked_user_id_idx ON blocked_users(blocked_user_id);
`;

const createFunctionQuery = `
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
    ) THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            IF row(NEW.*) IS DISTINCT FROM row(OLD.*) THEN
                NEW.updated_at = CURRENT_TIMESTAMP;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    END IF;
END $$;
`;

const createTriggersQuery = `
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name 
             FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name IN ('users', 'friendships', 'blocked_users', 'config')
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
            CREATE TRIGGER update_%I_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END $$;
`;

const createConfigTableQuery = `
CREATE TABLE IF NOT EXISTS config (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO config (key, value, description) 
VALUES ('api_server_url', '/api/v1/users', 'URL основного сервера API')
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value;
`;

interface PostgresError extends Error {
    position?: string;
    query?: string;
}

async function checkDatabaseExists(pool: Pool, dbName: string): Promise<boolean> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            [dbName]
        );
        return (result.rowCount ?? 0) > 0;
    } finally {
        client.release();
    }
}

async function createDatabase(pool: Pool, dbName: string): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query(`CREATE DATABASE ${dbName}`);
        console.log(`Database ${dbName} created successfully`);
    } finally {
        client.release();
    }
}

export async function initializeDatabase() {
    const [host, port] = config.database.host.split(':');
    const pool = new Pool({
        host: host,
        port: 5432,
        database: 'postgres',
        user: config.database.username,
        password: config.database.password || ""
    });

    try {
        // Проверяем существование базы данных
        const dbExists = await checkDatabaseExists(pool, config.database.database);
        if (!dbExists) {
            console.log(`Database ${config.database.database} does not exist, creating...`);
            await createDatabase(pool, config.database.database);
        }

        await pool.end();

        // Создаем новый пул для работы с нашей базой данных
        const appPool = new Pool({
            host: host,
            port: 5432,
            database: config.database.database,
            user: config.database.username,
            password: config.database.password || ""
        });

        console.log('Creating tables if they do not exist...');
        await appPool.query(createTableQuery);
        await appPool.query(createFriendshipsTableQuery);
        await appPool.query(createBlockedUsersTableQuery);
        console.log('Tables checked/created successfully');

        console.log('Creating/updating function for automatic timestamp updates...');
        await appPool.query(createFunctionQuery);
        console.log('Function checked/created successfully');

        console.log('Creating/updating triggers for all tables...');
        await appPool.query(createTriggersQuery);
        console.log('Triggers checked/created successfully');

        console.log('Creating config table if it does not exist...');
        await appPool.query(createConfigTableQuery);
        console.log('Config table checked/created successfully');

        console.log('Database initialization completed successfully');
        await appPool.end();
    } catch (error) {
        console.error('Error during database initialization:', error);
        const pgError = error as PostgresError;
        if (pgError.position) {
            console.error('Error position:', pgError.position);
            console.error('Query:', pgError.query);
        }
        throw error;
    }
}

// Запускаем инициализацию если скрипт запущен напрямую
if (require.main === module) {
    initializeDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
} 