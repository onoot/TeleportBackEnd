import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import { config } from '../config';

interface SignalingMessage {
    type: 'offer' | 'answer' | 'ice-candidate';
    payload: any;
    from: string;
    to: string;
    roomId: string;
}

export class WebSocketServer {
    private static instance: WebSocketServer;
    private wss: WebSocket.Server;
    private clients: Map<string, WebSocket> = new Map(); // userId -> WebSocket
    private roomParticipants: Map<string, Set<string>> = new Map(); // roomId -> Set<userId>

    private constructor() {
        this.wss = new WebSocket.Server({ port: parseInt(process.env.WS_PORT || '8083') });
        this.setupWebSocket();
    }

    public static getInstance(): WebSocketServer {
        if (!WebSocketServer.instance) {
            WebSocketServer.instance = new WebSocketServer();
        }
        return WebSocketServer.instance;
    }

    private setupWebSocket(): void {
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
                const decoded = jwt.verify(token, config.jwt.secret) as { id: string };
                const userId = decoded.id;

                // Сохраняем соединение
                this.clients.set(userId, ws);

                // Обработка сообщений
                ws.on('message', (message: string) => {
                    try {
                        const data = JSON.parse(message) as SignalingMessage;
                        
                        // Проверяем, что отправитель находится в комнате
                        const roomParticipants = this.roomParticipants.get(data.roomId);
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
                    this.roomParticipants.forEach((participants, roomId) => {
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

    // Метод для добавления пользователя в комнату
    public addUserToRoom(roomId: string, userId: string): void {
        if (!this.roomParticipants.has(roomId)) {
            this.roomParticipants.set(roomId, new Set());
        }
        this.roomParticipants.get(roomId)?.add(userId);
    }

    // Метод для удаления пользователя из комнаты
    public removeUserFromRoom(roomId: string, userId: string): void {
        this.roomParticipants.get(roomId)?.delete(userId);
    }
}