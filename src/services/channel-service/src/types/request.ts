import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    roles: string[];
  };
}

export type AuthMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

export type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  res: Response
) => Promise<void> | void;

export default AuthenticatedRequest; 