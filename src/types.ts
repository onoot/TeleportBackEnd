export interface UserSettings {
    notifications: boolean;
    theme: 'light' | 'dark';
    language: string;
}

export interface User {
    id: string;
    username: string;
    email: string;
    roles: string[];
    avatar?: string;
    status?: 'online' | 'offline';
    settings?: UserSettings;
    last_seen?: Date;
}

export interface JwtPayload {
    id: string;
    username: string;
    roles: string[];
    iat?: number;
    exp?: number;
}

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                username: string;
                roles: string[];
            };
        }
    }
} 