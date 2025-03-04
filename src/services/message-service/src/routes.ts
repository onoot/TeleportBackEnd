import { Router } from 'express';
import { Container } from 'typedi';
import { MessageController } from './controllers/v1/MessageController';
import { authMiddleware } from './middleware/auth';
import multer from 'multer';

export function setupRoutes(router: Router): Router {
  const messageController = Container.get(MessageController);
  const upload = multer();

  // Применяем middleware аутентификации ко всем маршрутам
  router.use('/api/v1/messages', authMiddleware);

  // Маршруты для личных сообщений
  router.get(
    '/dialogs/:userId/messages',
    async (req, res) => {
      const messages = await messageController.getDialogMessages(
        req.params.userId,
        parseInt(req.query.page as string) || 1,
        parseInt(req.query.limit as string) || 50,
        { id: req.user!.id }
      );
      res.json(messages);
    }
  );

  router.post(
    '/dialogs/:userId/messages',
    async (req, res) => {
      const message = await messageController.sendDirectMessage(
        req.params.userId,
        req.body,
        { id: req.user!.id }
      );
      res.json(message);
    }
  );

  // Маршруты для сообщений в каналах
  router.get(
    '/channels/:channelId/messages',
    async (req, res) => {
      const messages = await messageController.getChannelMessages(
        req.params.channelId,
        parseInt(req.query.page as string) || 1,
        parseInt(req.query.limit as string) || 50,
        { id: req.user!.id }
      );
      res.json(messages);
    }
  );

  router.post(
    '/channels/:channelId/messages',
    async (req, res) => {
      const message = await messageController.sendChannelMessage(
        req.params.channelId,
        req.body,
        { id: req.user!.id }
      );
      res.json(message);
    }
  );

  // Остальные маршруты
  router.get(
    '/unread',
    async (req, res) => {
      const messages = await messageController.getUnreadMessages({ id: req.user!.id });
      res.json(messages);
    }
  );

  router.post(
    '/:messageId/read',
    async (req, res) => {
      await messageController.markAsRead(
        req.params.messageId,
        { id: req.user!.id }
      );
      res.json({ success: true });
    }
  );

  router.post(
    '/dialogs/:userId/read',
    async (req, res) => {
      await messageController.markDialogAsRead(
        req.params.userId,
        { id: req.user!.id }
      );
      res.json({ success: true });
    }
  );

  router.post(
    '/:messageId',
    async (req, res) => {
      const message = await messageController.editMessage(
        req.params.messageId,
        req.body,
        { id: req.user!.id }
      );
      res.json(message);
    }
  );

  router.post(
    '/:messageId/delete',
    async (req, res) => {
      await messageController.deleteMessage(
        req.params.messageId,
        { id: req.user!.id }
      );
      res.json({ success: true });
    }
  );

  router.post(
    '/:messageId/reactions',
    async (req, res) => {
      const reaction = await messageController.addReaction(
        req.params.messageId,
        req.body,
        { id: req.user!.id }
      );
      res.json(reaction);
    }
  );

  router.post(
    '/:messageId/reactions/:emoji/delete',
    async (req, res) => {
      await messageController.removeReaction(
        req.params.messageId,
        req.params.emoji,
        { id: req.user!.id }
      );
      res.json({ success: true });
    }
  );

  router.get(
    '/:messageId/reactions',
    async (req, res) => {
      const reactions = await messageController.getMessageReactions(req.params.messageId);
      res.json(reactions);
    }
  );

  // Маршрут для загрузки вложений
  router.post(
    '/:channelId/attachments',
    async (req, res) => {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      const result = await messageController.uploadAttachment(
        req.params.channelId,
        req.file
      );
      res.json(result);
    }
  );

  return router;
} 