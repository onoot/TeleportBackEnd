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
      }
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const user = extractUserFromToken(token);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      roles: user.roles
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return null;
  }

  const [bearer, token] = authHeader.split(' ');
  if (bearer !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

function extractUserFromToken(token: string): { id: string; username: string; roles: string[] } | null {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { id: string; username: string; roles: string[] };
    return decoded;
  } catch (error) {
    return null;
  }
} 