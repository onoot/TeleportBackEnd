import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

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

export function verifyToken(token: string): { id: string; username: string; roles: string[] } {
    try {
        const decoded = jwt.verify(token, config.jwt.secret) as { id: string; username: string; roles: string[] };
        return {
            id: decoded.id,
            username: decoded.username,
            roles: decoded.roles
        };
    } catch (error) {
        throw new Error('Invalid token');
    }
}

export function extractToken(req: Request): string {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        throw new Error('No authorization header');
    }

    const [bearer, token] = authHeader.split(' ');
    if (bearer !== 'Bearer' || !token) {
        throw new Error('Invalid authorization header format');
    }

    return token;
}

export function extractUserFromToken(req: Request): void {
    try {
        const token = extractToken(req);
        const decoded = verifyToken(token);
        req.user = decoded;
    } catch (error) {
        throw new Error('Failed to extract user from token');
    }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    try {
        extractUserFromToken(req);
        next();
    } catch (error) {
        res.status(401).json({ error: 'Unauthorized' });
    }
}; 