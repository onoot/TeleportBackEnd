import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JwtPayload } from '../types';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: number;
                email: string;
            };
        }
    }
}

export const authMiddleware = (req: Request, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
        req.user = {
            id: decoded.id,
            email: decoded.email
        };
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
}; 