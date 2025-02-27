import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTablesInitial1709192400000 implements MigrationInterface {
    name = 'CreateTablesInitial1709192400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Создаем расширение для UUID если его нет
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // Проверяем существование таблицы rooms
        const roomsExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'rooms'
            );
        `);

        if (!roomsExists[0].exists) {
            await queryRunner.query(`
                CREATE TABLE "rooms" (
                    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    "name" VARCHAR(255),
                    "created_by" INTEGER NOT NULL,
                    "invite_code" VARCHAR(32) UNIQUE NOT NULL,
                    "is_active" BOOLEAN DEFAULT true,
                    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            `);
        }

        // Проверяем существование таблицы room_participants
        const roomParticipantsExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'room_participants'
            );
        `);

        if (!roomParticipantsExists[0].exists) {
            await queryRunner.query(`
                CREATE TABLE "room_participants" (
                    "id" SERIAL PRIMARY KEY,
                    "room_id" UUID NOT NULL,
                    "user_id" INTEGER NOT NULL,
                    "is_admin" BOOLEAN DEFAULT false,
                    "joined_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    "left_at" TIMESTAMP WITH TIME ZONE,
                    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT "room_participants_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE,
                    UNIQUE("room_id", "user_id")
                )
            `);
        }

        // Проверяем существование таблицы calls
        const callsExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'calls'
            );
        `);

        if (!callsExists[0].exists) {
            await queryRunner.query(`
                CREATE TABLE "calls" (
                    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    "room_id" UUID NOT NULL,
                    "initiator_id" INTEGER NOT NULL,
                    "type" VARCHAR(10) NOT NULL CHECK (type IN ('audio', 'video')),
                    "status" VARCHAR(20) NOT NULL CHECK (status IN ('initiated', 'connected', 'ended', 'rejected')),
                    "start_time" TIMESTAMP WITH TIME ZONE,
                    "end_time" TIMESTAMP WITH TIME ZONE,
                    "duration" INTEGER,
                    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT "calls_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE
                )
            `);
        }

        // Проверяем существование таблицы call_participants
        const callParticipantsExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'call_participants'
            );
        `);

        if (!callParticipantsExists[0].exists) {
            await queryRunner.query(`
                CREATE TABLE "call_participants" (
                    "id" SERIAL PRIMARY KEY,
                    "call_id" UUID NOT NULL,
                    "user_id" INTEGER NOT NULL,
                    "status" VARCHAR(20) NOT NULL CHECK (status IN ('invited', 'connected', 'disconnected')),
                    "call_type" VARCHAR(10) CHECK (call_type IN ('audio', 'video')),
                    "joined_at" TIMESTAMP WITH TIME ZONE,
                    "left_at" TIMESTAMP WITH TIME ZONE,
                    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT "call_participants_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "calls"("id") ON DELETE CASCADE,
                    UNIQUE("call_id", "user_id")
                )
            `);
        }

        // Создаем индексы, если они не существуют
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_rooms_invite_code" ON "rooms"("invite_code")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_rooms_created_by" ON "rooms"("created_by")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_room_participants_room_id" ON "room_participants"("room_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_room_participants_user_id" ON "room_participants"("user_id")`);

        // Проверяем существование таблицы calls перед созданием индексов
        const callsExistsForIndexes = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'calls'
            );
        `);

        if (callsExistsForIndexes[0].exists) {
            // Проверяем существование колонки initiator_id
            const initiatorIdExists = await queryRunner.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'calls' 
                    AND column_name = 'initiator_id'
                );
            `);

            if (initiatorIdExists[0].exists) {
                await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_calls_room_id" ON "calls"("room_id")`);
                await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_calls_initiator_id" ON "calls"("initiator_id")`);
                await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_calls_status" ON "calls"("status")`);
            }
        }

        // Проверяем существование таблицы call_participants перед созданием индексов
        const callParticipantsExistsForIndexes = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'call_participants'
            );
        `);

        if (callParticipantsExistsForIndexes[0].exists) {
            await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_call_participants_call_id" ON "call_participants"("call_id")`);
            await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_call_participants_user_id" ON "call_participants"("user_id")`);
            await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_call_participants_status" ON "call_participants"("status")`);
        }

        // Создаем функцию для автоматического обновления updated_at, если она не существует
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql'
        `);

        // Создаем триггеры, если они не существуют
        const tables = ['rooms', 'room_participants', 'calls', 'call_participants'];
        for (const table of tables) {
            const tableExists = await queryRunner.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = $1
                );
            `, [table]);

            if (tableExists[0].exists) {
                const triggerExists = await queryRunner.query(`
                    SELECT 1 FROM pg_trigger 
                    WHERE tgname = $1 
                    AND tgrelid = $2::regclass::oid
                `, [`update_${table}_updated_at`, table]);

                if (triggerExists.length === 0) {
                    await queryRunner.query(`
                        CREATE TRIGGER update_${table}_updated_at
                            BEFORE UPDATE ON ${table}
                            FOR EACH ROW
                            EXECUTE FUNCTION update_updated_at_column()
                    `);
                }
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Удаляем триггеры
        await queryRunner.query(`DROP TRIGGER IF EXISTS update_call_participants_updated_at ON call_participants`);
        await queryRunner.query(`DROP TRIGGER IF EXISTS update_calls_updated_at ON calls`);
        await queryRunner.query(`DROP TRIGGER IF EXISTS update_room_participants_updated_at ON room_participants`);
        await queryRunner.query(`DROP TRIGGER IF EXISTS update_rooms_updated_at ON rooms`);

        // Удаляем функцию
        await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column`);

        // Удаляем индексы
        await queryRunner.query(`DROP INDEX IF EXISTS idx_call_participants_status`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_call_participants_user_id`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_call_participants_call_id`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_calls_status`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_calls_initiator_id`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_calls_room_id`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_room_participants_user_id`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_room_participants_room_id`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_rooms_created_by`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_rooms_invite_code`);

        // Удаляем таблицы
        await queryRunner.query(`DROP TABLE IF EXISTS "call_participants"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "calls"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "room_participants"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "rooms"`);
    }
} 