import { Router, Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { authenticateToken } from '../middleware/auth';

export class NotificationController {
  private router: Router;
  private notificationService: NotificationService;

  constructor(notificationService: NotificationService) {
    this.router = Router();
    this.notificationService = notificationService;
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Получение всех уведомлений пользователя
    this.router.get('/', authenticateToken, async (req: Request, res: Response) => {
      try {
        const userId = req.user.id;
        const lastId = req.query.lastId as string;
        const notifications = await this.notificationService.getNotifications(userId, lastId);
        res.json(notifications);
      } catch (error) {
        res.status(500).json({ error: 'Ошибка при получении уведомлений' });
      }
    });

    // Отметка уведомлений как прочитанных
    this.router.post('/read', authenticateToken, async (req: Request, res: Response) => {
      try {
        const userId = req.user.id;
        const { notificationIds } = req.body;
        await this.notificationService.markAsRead(userId, notificationIds);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: 'Ошибка при отметке уведомлений' });
      }
    });

    // Удаление уведомлений
    this.router.delete('/', authenticateToken, async (req: Request, res: Response) => {
      try {
        const userId = req.user.id;
        const { notificationIds } = req.body;
        await this.notificationService.deleteNotifications(userId, notificationIds);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: 'Ошибка при удалении уведомлений' });
      }
    });

    // Получение количества непрочитанных уведомлений
    this.router.get('/unread/count', authenticateToken, async (req: Request, res: Response) => {
      try {
        const userId = req.user.id;
        const counts = await this.notificationService.getUnreadCount(userId);
        res.json(counts);
      } catch (error) {
        res.status(500).json({ error: 'Ошибка при получении количества непрочитанных уведомлений' });
      }
    });
  }

  getRouter(): Router {
    return this.router;
  }
} 