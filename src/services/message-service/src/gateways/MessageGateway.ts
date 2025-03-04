import { Server as HttpServer } from 'http';
import { BaseWebSocketGateway, AuthenticatedSocket } from '../shared/websocket/BaseWebSocketGateway';
import { Message } from '../entities/Message';
import { MessageService } from '../services/MessageService';
import { KafkaService } from '../services/KafkaService';
import { RedisService } from '../services/RedisService';
import { Socket } from 'socket.io';

interface MessagePayload {
  content: string;
  channelId: string;
  replyTo?: string;
  attachments?: string[];
}

export class MessageGateway extends BaseWebSocketGateway {
  constructor(
    server: HttpServer,
    redisService: RedisService,
    private messageService: MessageService,
    private kafkaService: KafkaService
  ) {
    super(server, redisService);
  }

  protected setupHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const authenticatedSocket = socket as AuthenticatedSocket;

      authenticatedSocket.on('join_channel', async (channelId: string) => {
        try {
          // Проверяем права доступа
          await this.messageService.checkAccess(authenticatedSocket.userId, channelId);
          
          // Подписываем на канал
          await this.subscribeToRoom(authenticatedSocket, `channel:${channelId}`);
          
          // Отправляем последние сообщения
          const messages = await this.messageService.getRecentMessages(channelId);
          authenticatedSocket.emit('initial_state', messages);
          
          // Сохраняем информацию об активном пользователе в Redis
          await this.redisService.addActiveUser(channelId, authenticatedSocket.userId);
        } catch (error) {
          authenticatedSocket.emit('error', { message: 'Failed to join channel' });
        }
      });

      authenticatedSocket.on('leave_channel', async (channelId: string) => {
        await this.unsubscribeFromRoom(authenticatedSocket, `channel:${channelId}`);
        await this.redisService.removeActiveUser(channelId, authenticatedSocket.userId);
      });

      authenticatedSocket.on('send_message', async (payload: MessagePayload) => {
        try {
          // Создаем сообщение
          const message = await this.messageService.createMessage({
            ...payload,
            authorId: authenticatedSocket.userId
          });

          // Получаем список онлайн пользователей в канале
          const onlineUsers = await this.getOnlineUsersInRoom(`channel:${payload.channelId}`);
          
          // Отправляем сообщение всем в канале
          await this.broadcastToRoom(`channel:${payload.channelId}`, 'message', {
            type: 'message_created',
            data: message
          });

          // Отправляем уведомление через Kafka только для оффлайн пользователей
          const channelMembers = await this.messageService.getChannelMembers(payload.channelId);
          const offlineUsers = channelMembers.filter(userId => !onlineUsers.includes(userId));
          
          if (offlineUsers.length > 0) {
            await this.kafkaService.send('notifications', {
              type: 'message_created',
              targetUsers: offlineUsers,
              data: {
                messageId: message.id,
                channelId: message.channelId,
                message: message
              }
            });
          }
        } catch (error) {
          authenticatedSocket.emit('error', { message: 'Failed to send message' });
        }
      });

      authenticatedSocket.on('typing', (channelId: string) => {
        authenticatedSocket.broadcast.to(`channel:${channelId}`).emit('user_typing', {
          userId: authenticatedSocket.userId,
          channelId
        });
      });

      authenticatedSocket.on('disconnect', async () => {
        // Удаляем пользователя из всех активных каналов
        for (const sub of authenticatedSocket.subscriptions) {
          if (sub.startsWith('channel:')) {
            const channelId = sub.split(':')[1];
            await this.redisService.removeActiveUser(channelId, authenticatedSocket.userId);
          }
        }
      });
    });
  }
} 