export type UserStatus = 'online' | 'offline';

export interface UserSettings {
    notifications?: {
        email?: boolean;
        push?: boolean;
    };
    theme?: 'light' | 'dark';
    language?: string;
}

export interface User {
    id: number;
    username: string;
    email: string;
    password: string;
    avatar: string | null;
    status: UserStatus;
    settings: UserSettings;
    last_seen: Date;
    email_verified: boolean;
    created_at: Date;
    updated_at: Date;
} 