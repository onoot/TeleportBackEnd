import { BaseWebSocketGateway, AuthenticatedSocket } from '../../../shared/websocket/BaseWebSocketGateway';
import { Message } from '../models/Message';
import { MessageService } from '../services/MessageService';
import { KafkaService } from '../services/KafkaService';

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
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      socket.on('join_channel', async (channelId: string) => {
        try {
          // Проверяем права доступа
          await this.messageService.checkAccess(socket.userId, channelId);
          
          // Подписываем на канал
          await this.subscribeToRoom(socket, `channel:${channelId}`);
          
          // Отправляем последние сообщения
          const messages = await this.messageService.getRecentMessages(channelId);
          socket.emit('initial_state', messages);
          
          // Сохраняем информацию об активном пользователе в Redis
          await this.redisService.addActiveUser(channelId, socket.userId);
        } catch (error) {
          socket.emit('error', { message: 'Failed to join channel' });
        }
      });

      socket.on('leave_channel', async (channelId: string) => {
        await this.unsubscribeFromRoom(socket, `channel:${channelId}`);
        await this.redisService.removeActiveUser(channelId, socket.userId);
      });

      socket.on('send_message', async (payload: MessagePayload) => {
        try {
          // Создаем сообщение
          const message = await this.messageService.createMessage({
            ...payload,
            authorId: socket.userId
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
                serverId: message.serverId,
                message: message
              }
            });
          }
        } catch (error) {
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      socket.on('typing', (channelId: string) => {
        socket.broadcast.to(`channel:${channelId}`).emit('user_typing', {
          userId: socket.userId,
          channelId
        });
      });

      socket.on('disconnect', async () => {
        // Удаляем пользователя из всех активных каналов
        for (const sub of socket.subscriptions) {
          if (sub.startsWith('channel:')) {
            const channelId = sub.split(':')[1];
            await this.redisService.removeActiveUser(channelId, socket.userId);
          }
        }
      });
    });
  }
} 