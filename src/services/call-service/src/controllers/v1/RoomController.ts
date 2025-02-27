import { Request, Response } from 'express';
import { JsonController, Post, Get, Body, Param, UseBefore, Req, Res, HttpCode, Delete } from 'routing-controllers';
import { authMiddleware } from '../../middleware/auth';
import { RoomService } from '../../services/RoomService';
import { AppDataSource } from '../../data-source';
import { Room } from '../../entities/Room';
import { RoomParticipant } from '../../entities/RoomParticipant';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { WebSocketService } from '../../services/WebSocketService';
import { JwtPayload } from '../../types';

@JsonController('/rooms')
export class RoomController {
    private wsService: WebSocketService;
    private roomService: RoomService;

    constructor() {
        this.wsService = WebSocketService.getInstance();
        this.roomService = new RoomService();
    }

    @Get('/')
    @UseBefore(authMiddleware)
    @HttpCode(200)
    async getUserRooms(@Req() req: Request, @Res() response: Response) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return response.status(401).json({
                    status: 401,
                    message: "Отсутствует токен авторизации"
                });
            }

            const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
            const userId = parseInt(decoded.id.toString());

            const rooms = await this.roomService.getRoomsByUserId(userId);
            return response.json({
                status: 200,
                data: rooms
            });
        } catch (error) {
            console.error('Error getting user rooms:', error);
            return response.status(500).json({
                status: 500,
                message: "Ошибка при получении списка комнат"
            });
        }
    }

    @Post('/')
    @UseBefore(authMiddleware)
    @HttpCode(200)
    async createRoom(
        @Body() data: { name: string },
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
            const userId = parseInt(decoded.id.toString());

            const room = await this.roomService.createRoom(data.name, userId);
            return response.json({
                status: 200,
                data: room
            });
        } catch (error) {
            console.error('Error creating room:', error);
            return response.status(500).json({
                status: 500,
                message: "Ошибка при создании комнаты"
            });
        }
    }

    @Get('/:roomId')
    @UseBefore(authMiddleware)
    @HttpCode(200)
    async getRoomById(
        @Param('roomId') roomId: string,
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
            const userId = parseInt(decoded.id.toString());

            const isParticipant = await this.roomService.isRoomParticipant(roomId, userId);
            if (!isParticipant) {
                return response.status(403).json({
                    status: 403,
                    message: "У вас нет доступа к этой комнате"
                });
            }

            const room = await this.roomService.getRoomById(roomId);
            return response.json({
                status: 200,
                data: room
            });
        } catch (error) {
            console.error('Error getting room:', error);
            return response.status(500).json({
                status: 500,
                message: "Ошибка при получении информации о комнате"
            });
        }
    }

    @Post('/join')
    @UseBefore(authMiddleware)
    @HttpCode(200)
    async joinRoom(
        @Body() data: { inviteCode: string },
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
            const userId = parseInt(decoded.id.toString());

            const room = await this.roomService.joinRoomByInvite(data.inviteCode, userId);
            return response.json({
                status: 200,
                data: room
            });
        } catch (error) {
            console.error('Error joining room:', error);
            return response.status(500).json({
                status: 500,
                message: "Ошибка при присоединении к комнате"
            });
        }
    }

    @Post('/:roomId/participants')
    @UseBefore(authMiddleware)
    @HttpCode(200)
    async addParticipant(
        @Param('roomId') roomId: string,
        @Body() data: { userId: number },
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
            const currentUserId = parseInt(decoded.id.toString());

            const isParticipant = await this.roomService.isRoomParticipant(roomId, currentUserId);
            if (!isParticipant) {
                return response.status(403).json({
                    status: 403,
                    message: "У вас нет доступа к этой комнате"
                });
            }

            await this.roomService.addParticipant(roomId, data.userId);
            return response.json({
                status: 200,
                message: "Участник успешно добавлен"
            });
        } catch (error) {
            console.error('Error adding participant:', error);
            return response.status(500).json({
                status: 500,
                message: "Ошибка при добавлении участника"
            });
        }
    }

    @Delete('/:roomId/leave')
    @UseBefore(authMiddleware)
    @HttpCode(200)
    async leaveRoom(
        @Param('roomId') roomId: string,
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
            const userId = parseInt(decoded.id.toString());

            await this.roomService.removeParticipant(roomId, userId);
            return response.json({
                status: 200,
                message: "Вы успешно покинули комнату"
            });
        } catch (error) {
            console.error('Error leaving room:', error);
            return response.status(500).json({
                status: 500,
                message: "Ошибка при выходе из комнаты"
            });
        }
    }

    @Get('/:roomId/participants')
    @UseBefore(authMiddleware)
    @HttpCode(200)
    async getRoomParticipants(
        @Param('roomId') roomId: string,
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
            const userId = parseInt(decoded.id.toString());

            const isParticipant = await this.roomService.isRoomParticipant(roomId, userId);
            if (!isParticipant) {
                return response.status(403).json({
                    status: 403,
                    message: "У вас нет доступа к этой комнате"
                });
            }

            const participants = await this.roomService.getRoomParticipants(roomId);
            return response.json({
                status: 200,
                data: participants
            });
        } catch (error) {
            console.error('Error getting room participants:', error);
            return response.status(500).json({
                status: 500,
                message: "Ошибка при получении списка участников"
            });
        }
    }
} 