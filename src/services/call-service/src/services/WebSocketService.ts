import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { Server } from 'http';

interface SignalingMessage {
    type: 'offer' | 'answer' | 'ice-candidate';
    payload: any;
    from: number;
    to: number;
    roomId: string;
}

export class WebSocketService {
    private static instance: WebSocketService;
    private wss: WebSocket.Server;
    private clients: Map<number, WebSocket> = new Map(); // userId -> WebSocket
    private rooms: Map<string, Set<number>> = new Map(); // roomId -> Set<userId>

    private constructor(server: Server) {
        this.wss = new WebSocket.Server({ server });
        this.setupWebSocket();
    }

    public static getInstance(server?: Server): WebSocketService {
        if (!WebSocketService.instance && server) {
            WebSocketService.instance = new WebSocketService(server);
        }
        return WebSocketService.instance;
    }

    private setupWebSocket(): void {
        if (!this.wss) return;

        this.wss.on('connection', (ws: WebSocket, req: any) => {
            // Получаем токен из query параметров
            const url = new URL(req.url, 'ws://localhost');
            const token = url.searchParams.get('token');

            if (!token) {
                ws.close(1008, 'Token required');
                return;
            }

            try {
                // Проверяем токен
                const decoded = jwt.verify(token, config.jwt.secret) as { id: number };
                const userId = decoded.id;

                // Сохраняем соединение
                this.clients.set(userId, ws);

                // Обработка сообщений
                ws.on('message', (message: string) => {
                    try {
                        const data = JSON.parse(message) as SignalingMessage;
                        
                        // Проверяем, что отправитель находится в комнате
                        const roomParticipants = this.rooms.get(data.roomId);
                        if (!roomParticipants?.has(userId)) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: 'You are not in this room'
                            }));
                            return;
                        }

                        // Проверяем, что получатель находится в комнате
                        if (!roomParticipants.has(data.to)) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: 'Target user is not in this room'
                            }));
                            return;
                        }

                        // Отправляем сигнал получателю
                        const targetWs = this.clients.get(data.to);
                        if (targetWs) {
                            targetWs.send(JSON.stringify({
                                type: data.type,
                                payload: data.payload,
                                from: userId,
                                roomId: data.roomId
                            }));
                        }
                    } catch (error) {
                        console.error('Error processing message:', error);
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Invalid message format'
                        }));
                    }
                });

                // Обработка отключения
                ws.on('close', () => {
                    this.clients.delete(userId);
                    // Удаляем пользователя из всех комнат
                    this.rooms.forEach((participants, roomId) => {
                        if (participants.has(userId)) {
                            participants.delete(userId);
                        }
                    });
                });

            } catch (error) {
                console.error('Authentication error:', error);
                ws.close(1008, 'Authentication failed');
            }
        });
    }

    public addUserToRoom(roomId: string, userId: number): void {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set());
        }
        this.rooms.get(roomId)?.add(userId);
    }

    public removeUserFromRoom(roomId: string, userId: number): void {
        this.rooms.get(roomId)?.delete(userId);
        if (this.rooms.get(roomId)?.size === 0) {
            this.rooms.delete(roomId);
        }
    }

    public isUserInRoom(roomId: string, userId: number): boolean {
        return this.rooms.get(roomId)?.has(userId) ?? false;
    }

    public getRoomParticipants(roomId: string): number[] {
        return Array.from(this.rooms.get(roomId) || []);
    }

    public sendToRoom(roomId: string, message: any) {
        const users = this.rooms.get(roomId);
        if (users) {
            users.forEach(userId => {
                const client = this.clients.get(userId);
                if (client && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(message));
                }
            });
        }
    }

    public sendToUser(userId: number, message: any) {
        const client = this.clients.get(userId);
        if (client && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    }

    public close(): void {
        this.wss?.close();
    }
} 