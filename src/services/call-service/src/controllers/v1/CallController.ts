import { Request, Response, Router } from 'express';
import { CallService } from '../../services/CallService';
import { RoomService } from '../../services/RoomService';
import { CallType, JwtPayload } from '../../types';
import { WebSocketService } from '../../services/WebSocketService';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { authMiddleware } from '../../middleware/auth';

interface SignalingMessage {
    type: 'offer' | 'answer' | 'ice-candidate';
    payload: any;
    from: number;
    to: number;
    roomId: string;
}

export class CallController {
    private wsService: WebSocketService;
    private callService: CallService;
    private roomService: RoomService;
    public router: Router;

    constructor(roomService: RoomService, callService: CallService) {
        this.roomService = roomService;
        this.callService = callService;
        this.wsService = WebSocketService.getInstance();
        this.callService.setWebSocketService(this.wsService);
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post('/user/:userId', authMiddleware, this.callUser.bind(this));
        this.router.put('/:callId/accept', authMiddleware, this.acceptCall.bind(this));
        this.router.post('/:callId/reject', authMiddleware, this.rejectCall.bind(this));
        this.router.post('/:callId/end', authMiddleware, this.endCall.bind(this));
        this.router.post('/:callId/signal', authMiddleware, this.sendSignal.bind(this));
        this.router.post('/:callId/invite', authMiddleware, this.generateInvite.bind(this));
    }

    private async callUser(req: Request, res: Response) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({
                    status: 401,
                    message: "Отсутствует токен авторизации"
                });
            }

            const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
            const initiatorId = Number(decoded.id);
            const targetUserIdNum = Number(req.params.userId);
            const data = req.body;

            if (initiatorId === targetUserIdNum) {
                return res.status(400).json({
                    status: 400,
                    message: "Нельзя позвонить самому себе"
                });
            }

            if (!data.type || !['audio', 'video'].includes(data.type)) {
                return res.status(400).json({
                    status: 400,
                    message: "Неверный тип звонка"
                });
            }

            const room = await this.roomService.createPrivateRoom(initiatorId, targetUserIdNum);
            const call = await this.callService.createCall(room.id, initiatorId, data.type);

            await this.callService.addParticipant(call.id, initiatorId, data.type);
            await this.callService.addParticipant(call.id, targetUserIdNum, data.type);

            return res.status(201).json({
                status: 201,
                data: {
                    call,
                    room
                }
            });
        } catch (error) {
            console.error('Error calling user:', error);
            return res.status(500).json({
                status: 500,
                message: "Ошибка при звонке пользователю"
            });
        }
    }

    private async acceptCall(req: Request, res: Response) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({
                    status: 401,
                    message: "Отсутствует токен авторизации"
                });
            }

            const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
            const userId = Number(decoded.id);
            const callId = req.params.callId;

            const call = await this.callService.acceptCall(callId, userId);

            return res.status(200).json({
                status: 200,
                data: call
            });
        } catch (error) {
            console.error('Error accepting call:', error);
            return res.status(500).json({
                status: 500,
                message: "Ошибка при принятии звонка"
            });
        }
    }

    private async rejectCall(req: Request, res: Response) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({
                    status: 401,
                    message: "Отсутствует токен авторизации"
                });
            }

            const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
            const userId = Number(decoded.id);
            const callId = req.params.callId;

            const call = await this.callService.rejectCall(callId, userId);

            return res.status(200).json({
                status: 200,
                data: call
            });
        } catch (error) {
            console.error('Error rejecting call:', error);
            return res.status(500).json({
                status: 500,
                message: "Ошибка при отклонении звонка"
            });
        }
    }

    private async endCall(req: Request, res: Response) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({
                    status: 401,
                    message: "Отсутствует токен авторизации"
                });
            }

            const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
            const userId = Number(decoded.id);
            const callId = req.params.callId;

            await this.callService.endCall(callId);

            return res.status(200).json({
                status: 200,
                message: "Звонок завершен"
            });
        } catch (error) {
            console.error('Error ending call:', error);
            return res.status(500).json({
                status: 500,
                message: "Ошибка при завершении звонка"
            });
        }
    }

    private async sendSignal(req: Request, res: Response) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({
                    status: 401,
                    message: "Отсутствует токен авторизации"
                });
            }

            const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
            const userId = Number(decoded.id);
            const callId = req.params.callId;
            const signal: SignalingMessage = req.body;

            await this.callService.sendSignal(callId, userId, signal);

            return res.status(200).json({
                status: 200,
                message: "Сигнал отправлен"
            });
        } catch (error) {
            console.error('Error sending signal:', error);
            return res.status(500).json({
                status: 500,
                message: "Ошибка при отправке сигнала"
            });
        }
    }

    private async generateInvite(req: Request, res: Response) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({
                    status: 401,
                    message: "Отсутствует токен авторизации"
                });
            }

            const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
            const userId = Number(decoded.id);
            const callId = req.params.callId;

            const invite = await this.callService.generateInvite(callId, userId);

            return res.status(200).json({
                status: 200,
                data: invite
            });
        } catch (error) {
            console.error('Error generating invite:', error);
            return res.status(500).json({
                status: 500,
                message: "Ошибка при генерации приглашения"
            });
        }
    }
}