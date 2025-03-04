import { Permission } from './role';

export interface DatabaseConfig {
  type: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
  logging: boolean;
  entities: string[];
  migrations: string[];
  subscribers: string[];
  cli: {
    entitiesDir: string;
    migrationsDir: string;
    subscribersDir: string;
  };
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
}

export interface CallServiceConfig {
  url: string;
  healthCheckEndpoint: string;
}

export interface RoleConfig {
  name: string;
  permissions: Permission[];
  position: number;
  is_deletable: boolean;
}

export interface DefaultRolesConfig {
  owner: RoleConfig;
  member: RoleConfig;
}

export interface CorsConfig {
  origin: string;
  methods: string[];
  allowedHeaders: string[];
}

export interface LoggingConfig {
  level: string;
}

export interface KafkaConfig {
  brokers: string[];
  ssl: boolean;
  sasl?: {
    username: string;
    password: string;
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
  };
}

export interface Config {
  port: number;
  database: DatabaseConfig;
  jwt: JwtConfig;
  callService: CallServiceConfig;
  defaultRoles: DefaultRolesConfig;
  cors: CorsConfig;
  logging: LoggingConfig;
  kafka: KafkaConfig;
} 