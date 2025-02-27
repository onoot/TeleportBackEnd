import { Pool } from 'pg';
import { config } from '../config';

export class UserService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: config.postgres.host,
      port: config.postgres.port,
      database: config.postgres.database,
      user: config.postgres.user,
      password: config.postgres.password
    });
  }

  async getUserById(userId: number): Promise<any> {
    const result = await this.pool.query(
      'SELECT id, username, email FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0];
  }

  async checkUsersExist(userIds: number[]): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT COUNT(*) as count FROM users WHERE id = ANY($1)',
      [userIds]
    );
    return result.rows[0].count === userIds.length;
  }

  async getUsersInfo(userIds: number[]): Promise<any[]> {
    if (!userIds.length) return [];
    
    const result = await this.pool.query(
      'SELECT id, username, email FROM users WHERE id = ANY($1)',
      [userIds]
    );
    return result.rows;
  }
} 