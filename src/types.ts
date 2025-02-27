export interface UserSettings {
    notifications: boolean;
    theme: 'light' | 'dark';
    language: string;
}

export interface User {
    id: number;
    username: string;
    email: string;
    avatar?: string;
    status?: 'online' | 'offline';
    settings?: UserSettings;
    last_seen?: Date;
}

export interface JwtPayload {
    id: number;
    email: string;
    username?: string;
    iat?: number;
    exp?: number;
}

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: number;
                email: string;
                username?: string;
            };
        }
    }
} 