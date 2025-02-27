import { Request, Response } from 'express';
import { JsonController, Post, Get, Put, Body, Param, UseBefore, Req, Res, HttpCode } from 'routing-controllers';
import { authMiddleware } from '../../middleware/auth';
import { CallService } from '../../services/CallService';
import { RoomService } from '../../services/RoomService';
import { CallType, ParticipantStatus, JwtPayload } from '../../types';
import { AppDataSource } from '../../data-source';
import { Call } from '../../entities/Call';
import { CallParticipant } from '../../entities/CallParticipant';
import { Room } from '../../entities/Room';
import { RoomParticipant } from '../../entities/RoomParticipant';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { WebSocketService } from '../../services/WebSocketService';

interface SignalingMessage {
    type: 'offer' | 'answer' | 'ice-candidate';
    payload: any;
    from: number;
    to: number;
    roomId: string;
}

@JsonController('/calls')
export class CallController {
    private wsService: WebSocketService;
    private callService: CallService;
    private roomService: RoomService;

    constructor(roomService: RoomService, callService: CallService) {
        this.roomService = roomService;
        this.callService = callService;
        this.wsService = WebSocketService.getInstance();
        this.callService.setWebSocketService(this.wsService);
    }

    @Post('/user/:userId')
    @UseBefore(authMiddleware)
    @HttpCode(201)
    async callUser(
        @Param('userId') targetUserId: number,
        @Body() data: { type: CallType },
        @Req() req: Request,
        @Res() response: Response
    ) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return response.status(401).json({
                    status: 401,
                    message: "Отсутствует токен авторизации"
                });
            }

            const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
            const initiatorId = Number(decoded.id);
            const targetUserIdNum = Number(targetUserId);

            if (initiatorId === targetUserIdNum) {
                return response.status(400).json({
                    status: 400,
                    message: "Нельзя позвонить самому себе"
                });
            }

            if (!data.type || !['audio', 'video'].includes(data.type)) {
                return response.status(400).json({
                    status: 400,
                    message: "Неверный тип звонка"
                });
            }

            const room = await this.roomService.createPrivateRoom(initiatorId, targetUserIdNum);
            
            const call = await this.callService.createCall(room.id, initiatorId, data.type);

            await this.callService.addParticipant(call.id, initiatorId, data.type);
            await this.callService.addParticipant(call.id, targetUserIdNum, data.type);

            return response.status(201).json({
                status: 201,
                data: {
                    call,
                    room
                }
            });
        } catch (error) {
            console.error('Error calling user:', error);
            return response.status(500).json({
                status: 500,
                message: "Ошибка при звонке пользователю"
            });
        }
    }

    @Put('/:callId/accept')
    @UseBefore(authMiddleware)
    @HttpCode(200)
    async acceptCall(
        @Param('callId') callId: string,
        @Req() req: Request,
        @Res() response: Response
    ) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return response.status(401).json({
                    status: 401,
                    message: "Отсутствует токен авторизации"
                });
            }

            const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
            const userId = Number(decoded.id);

            const call = await this.callService.acceptCall(callId, userId);

            return response.status(200).json({
                status: 200,
                data: call
            });
        } catch (error) {
            console.error('Error accepting call:', error);
            return response.status(500).json({
                status: 500,
                message: "Ошибка при принятии звонка"
            });
        }
    }

    @Post('/:callId/reject')
    @UseBefore(authMiddleware)
    @HttpCode(200)
    async rejectCall(
        @Param('callId') callId: string,
        @Req() req: Request,
        @Res() response: Response
    ) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return response.status(401).json({
                    status: 401,
                    message: "Отсутствует токен авторизации"
                });
            }

            const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
            const userId = Number(decoded.id);

            const call = await this.callService.rejectCall(callId, userId);

            return response.status(200).json({
                status: 200,
                data: call
            });
        } catch (error) {
            console.error('Error rejecting call:', error);
            return response.status(500).json({
                status: 500,
                message: "Ошибка при отклонении звонка"
            });
        }
    }

    @Post('/:callId/end')
    @UseBefore(authMiddleware)
    @HttpCode(200)
    async endCall(
        @Param('callId') callId: string,
        @Req() req: Request,
        @Res() response: Response
    ) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return response.status(401).json({
                    status: 401,
                    message: "Отсутствует токен авторизации"
                });
            }

            const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
            const userId = Number(decoded.id);

            await this.callService.endCall(callId);

            return response.status(200).json({
                status: 200,
                message: "Звонок завершен"
            });
        } catch (error) {
            console.error('Error ending call:', error);
            return response.status(500).json({
                status: 500,
                message: "Ошибка при завершении звонка"
            });
        }
    }

    @Post('/:callId/signal')
    @UseBefore(authMiddleware)
    @HttpCode(200)
    async sendSignal(
        @Param('callId') callId: string,
        @Body() signal: SignalingMessage,
        @Req() req: Request,
        @Res() response: Response
    ) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return response.status(401).json({
                    status: 401,
                    message: "Отсутствует токен авторизации"
                });
            }

            const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
            const userId = Number(decoded.id);

            await this.callService.sendSignal(callId, userId, signal);

            return response.status(200).json({
                status: 200,
                message: "Сигнал отправлен"
            });
        } catch (error) {
            console.error('Error sending signal:', error);
            return response.status(500).json({
                status: 500,
                message: "Ошибка при отправке сигнала"
            });
        }
    }

    @Post('/:callId/invite')
    @UseBefore(authMiddleware)
    @HttpCode(200)
    async generateInvite(
        @Param('callId') callId: string,
        @Req() req: Request,
        @Res() response: Response
    ) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return response.status(401).json({
                    status: 401,
                    message: "Отсутствует токен авторизации"
                });
            }

            const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
            const userId = decoded.id.toString();

            const call = await this.callService.getCallById(callId);
            if (!call) {
                return response.status(404).json({
                    status: 404,
                    message: "Звонок не найден"
                });
            }

            const inviteCode = await this.roomService.generateInvite(call.room_id);
            return response.json({
                status: 200,
                data: {
                    invite_code: inviteCode
                }
            });
        } catch (error) {
            console.error('Error generating invite:', error);
            return response.status(500).json({
                status: 500,
                message: "Ошибка при генерации приглашения"
            });
        }
    }
}