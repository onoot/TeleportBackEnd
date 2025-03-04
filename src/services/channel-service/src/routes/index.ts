import { Router, Response } from 'express';
import { ServerController } from '../controllers/ServerController';
import { CategoryController } from '../controllers/CategoryController';
import { ChannelController } from '../controllers/ChannelController';
import { authMiddleware } from '../middleware/auth';
import { RoleController } from '../controllers/RoleController';
import { AuthenticatedRequest } from '../types/request';

const router = Router();

// Маршрут для проверки работоспособности
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Инициализация контроллеров
let serverController: ServerController;
let roleController: RoleController;

// Инициализируем контроллеры перед определением маршрутов
(async () => {
  serverController = await ServerController.getInstance();
  roleController = await RoleController.getInstance();

  // Маршруты для серверов
  router.post('/servers', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    await serverController.createServer(req, res);
  });
  
  router.get('/servers/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    await serverController.getServer(req, res);
  });
  
  router.put('/servers/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    await serverController.updateServer(req, res);
  });
  
  router.delete('/servers/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    await serverController.deleteServer(req, res);
  });
  
  router.post('/servers/join', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    await serverController.joinServer(req, res);
  });
  
  router.get('/servers/:id/members', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    await serverController.getServerMembers(req, res);
  });

  // Маршруты для категорий
  router.post('/servers/:serverId/categories', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    await CategoryController.createCategory(req, res);
  });
  
  router.get('/servers/:serverId/categories', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    await CategoryController.getServerCategories(req, res);
  });
  
  router.put('/categories/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    await CategoryController.updateCategory(req, res);
  });
  
  router.delete('/categories/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    await CategoryController.deleteCategory(req, res);
  });

  // Маршруты для каналов
  router.post('/categories/:categoryId/channels', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    await ChannelController.createChannel(req, res);
  });
  
  router.get('/categories/:categoryId/channels', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    await ChannelController.getCategoryChannels(req, res);
  });
  
  router.put('/channels/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    await ChannelController.updateChannel(req, res);
  });
  
  router.delete('/channels/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    await ChannelController.deleteChannel(req, res);
  });

  // Маршруты для управления ролями
  router.post('/servers/:serverId/roles', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    await roleController.createRole(req, res);
  });
  
  router.put('/roles/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    await roleController.updateRole(req, res);
  });
  
  router.delete('/roles/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    await roleController.deleteRole(req, res);
  });
  
  router.get('/servers/:serverId/roles', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    await roleController.getServerRoles(req, res);
  });
  
  router.post('/roles/:roleId/assign', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    await roleController.assignRole(req, res);
  });
  
  router.post('/roles/:roleId/remove', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    await roleController.removeRole(req, res);
  });
})();

export default router; 