import { Request, Response } from 'express';
import { JsonController, Post, Get, Put, Body, Param, UseBefore, Req, Res, HttpCode } from 'routing-controllers';
import { authMiddleware } from '../../middleware/auth';
import { AppDataSource } from '../../data-source';
import { User } from '../../entities/User';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { KafkaService } from '../../services/KafkaService';
import { NotificationType } from '../../types/events';

interface JwtPayload {
  id: number;
  username: string;
}

@JsonController('/users')
export class UserController {
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly kafkaService: KafkaService;

  constructor() {
    this.kafkaService = new KafkaService();
  }

  @Get('/me')
  @UseBefore(authMiddleware)
  async getCurrentUser(@Req() req: Request, @Res() response: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return response.status(401).json({
          status: 401,
          message: "Отсутствует токен авторизации"
        });
      }

      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      const user = await this.userRepository.findOne({ 
        where: { id: decoded.id },
        select: ['id', 'username', 'email', 'avatar', 'status', 'settings', 'last_seen'] 
      });

      if (!user) {
        return response.status(404).json({
          status: 404,
          message: "Пользователь не найден"
        });
      }

      return response.json({
        status: 200,
        data: user
      });
    } catch (error) {
      console.error('Error getting current user:', error);
      return response.status(500).json({
        status: 500,
        message: "Ошибка при получении данных пользователя"
      });
    }
  }

  @Put('/me')
  @UseBefore(authMiddleware)
  async updateCurrentUser(
    @Req() req: Request,
    @Body() data: { username?: string; email?: string; settings?: any; avatar?: string | null },
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
      const user = await this.userRepository.findOne({ where: { id: decoded.id } });

      if (!user) {
        return response.status(404).json({
          status: 404,
          message: "Пользователь не найден"
        });
      }

      // Обновляем только предоставленные поля
      if (data.username) user.username = data.username;
      if (data.email) user.email = data.email;
      if (data.settings) user.settings = { ...user.settings, ...data.settings };

      // Обработка аватара
      if (data.avatar === 'delete') {
        user.avatar = null;
      } else if (data.avatar === null) {
        // Не меняем аватар
      } else if (data.avatar) {
        // TODO: Сохранение файла в R2 хранилище
        user.avatar = data.avatar;
      }

      await this.userRepository.save(user);

      // Отправляем уведомление об обновлении пользователя
      if (data.settings) {
        await this.kafkaService.emit('users', {
          type: NotificationType.USER_SETTINGS_UPDATE,
          userId: user.id,
          data: {
            settings: user.settings
          }
        });
      }

      if (data.avatar !== undefined) {
        await this.kafkaService.emit('users', {
          type: NotificationType.USER_AVATAR_UPDATE,
          userId: user.id,
          data: {
            avatar: user.avatar
          }
        });
      }

      return response.json({
        status: 200,
        data: user
      });
    } catch (error) {
      console.error('Error updating user:', error);
      return response.status(500).json({
        status: 500,
        message: "Ошибка при обновлении пользователя"
      });
    }
  }

  @Put('/me/status')
  @UseBefore(authMiddleware)
  async updateStatus(
    @Req() req: Request,
    @Body() data: { status: string },
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
      const user = await this.userRepository.findOne({ where: { id: decoded.id } });

      if (!user) {
        return response.status(404).json({
          status: 404,
          message: "Пользователь не найден"
        });
      }

      user.status = data.status;
      await this.userRepository.save(user);

      // Отправляем уведомление об изменении статуса
      await this.kafkaService.emit('users', {
        type: NotificationType.USER_STATUS_UPDATE,
        userId: user.id,
        data: {
          status: user.status
        }
      });

      return response.json({
        status: 200,
        data: user
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      return response.status(500).json({
        status: 500,
        message: "Ошибка при обновлении статуса"
      });
    }
  }

  @Get('/:id')
  @UseBefore(authMiddleware)
  async getUser(@Param('id') id: number, @Res() response: Response) {
    try {
      const user = await this.userRepository.findOne({ 
        where: { id },
        select: ['id', 'username', 'avatar', 'status', 'last_seen']
      });

      if (!user) {
        return response.status(404).json({
          status: 404,
          message: "Пользователь не найден"
        });
      }

      return response.json({
        status: 200,
        data: user
      });
    } catch (error) {
      console.error('Error getting user:', error);
      return response.status(500).json({
        status: 500,
        message: "Ошибка при получении данных пользователя"
      });
    }
  }

  @Post('/search')
  @UseBefore(authMiddleware)
  async searchUsers(
    @Body() data: { query: string },
    @Res() response: Response
  ) {
    try {
      const users = await this.userRepository
        .createQueryBuilder('user')
        .where('user.username ILIKE :query', { query: `%${data.query}%` })
        .select(['user.id', 'user.username', 'user.avatar', 'user.status'])
        .take(10)
        .getMany();

      return response.json({
        status: 200,
        data: users
      });
    } catch (error) {
      console.error('Error searching users:', error);
      return response.status(500).json({
        status: 500,
        message: "Ошибка при поиске пользователей"
      });
    }
  }

  @Post('/logout')
  @UseBefore(authMiddleware)
  @HttpCode(200)
  async logout(@Req() req: Request, @Res() response: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return response.status(401).json({
          status: 401,
          message: "Отсутствует токен авторизации"
        });
      }

      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      
      // Отправляем событие о выходе пользователя
      await this.kafkaService.emit('users', {
        type: NotificationType.USER_LOGOUT,
        userId: decoded.id,
        data: {
          timestamp: new Date()
        }
      });

      return response.json({
        status: 200,
        message: "Успешный выход из системы"
      });
    } catch (error) {
      console.error('Error during logout:', error);
      return response.status(500).json({
        status: 500,
        message: "Ошибка при выходе из системы"
      });
    }
  }

  @Put('/me/last-seen')
  @UseBefore(authMiddleware)
  @HttpCode(200)
  async updateLastSeen(@Req() req: Request, @Res() response: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return response.status(401).json({
          status: 401,
          message: "Отсутствует токен авторизации"
        });
      }

      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      const user = await this.userRepository.findOne({ where: { id: decoded.id } });

      if (!user) {
        return response.status(404).json({
          status: 404,
          message: "Пользователь не найден"
        });
      }

      user.last_seen = new Date();
      await this.userRepository.save(user);

      // Отправляем событие об обновлении времени последнего посещения
      await this.kafkaService.emit('users', {
        type: NotificationType.USER_LAST_SEEN_UPDATE,
        userId: user.id,
        data: {
          last_seen: user.last_seen
        }
      });

      return response.json({
        status: 200,
        data: {
          last_seen: user.last_seen
        }
      });
    } catch (error) {
      console.error('Error updating last seen:', error);
      return response.status(500).json({
        status: 500,
        message: "Ошибка при обновлении времени последнего посещения"
      });
    }
  }

  @Get('/online')
  @UseBefore(authMiddleware)
  async getOnlineUsers(@Res() response: Response) {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const users = await this.userRepository
        .createQueryBuilder('user')
        .where('user.last_seen > :fiveMinutesAgo', { fiveMinutesAgo })
        .select(['user.id', 'user.username', 'user.avatar', 'user.status', 'user.last_seen'])
        .getMany();

      return response.json({
        status: 200,
        data: users
      });
    } catch (error) {
      console.error('Error getting online users:', error);
      return response.status(500).json({
        status: 500,
        message: "Ошибка при получении списка онлайн пользователей"
      });
    }
  }
}