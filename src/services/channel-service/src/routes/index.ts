import { Router } from 'express';
import { ServerController } from '../controllers/ServerController';
import { CategoryController } from '../controllers/CategoryController';
import { ChannelController } from '../controllers/ChannelController';
import { authMiddleware } from '../middleware/auth';
import { RoleController } from '../controllers/RoleController';

const router = Router();

// Маршрут для проверки работоспособности
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Маршруты для серверов
router.post('/servers', authMiddleware, ServerController.createServer);
router.get('/servers/:id', authMiddleware, ServerController.getServer);
router.put('/servers/:id', authMiddleware, ServerController.updateServer);
router.delete('/servers/:id', authMiddleware, ServerController.deleteServer);
router.post('/servers/join', authMiddleware, ServerController.joinServer);
router.get('/servers/:id/members', authMiddleware, ServerController.getServerMembers);

// Маршруты для категорий
router.post('/servers/:serverId/categories', authMiddleware, CategoryController.createCategory);
router.get('/servers/:serverId/categories', authMiddleware, CategoryController.getServerCategories);
router.put('/categories/:id', authMiddleware, CategoryController.updateCategory);
router.delete('/categories/:id', authMiddleware, CategoryController.deleteCategory);

// Маршруты для каналов
router.post('/categories/:categoryId/channels', authMiddleware, ChannelController.createChannel);
router.get('/categories/:categoryId/channels', authMiddleware, ChannelController.getCategoryChannels);
router.put('/channels/:id', authMiddleware, ChannelController.updateChannel);
router.delete('/channels/:id', authMiddleware, ChannelController.deleteChannel);

// Маршруты для управления ролями
router.post('/servers/:serverId/roles', authMiddleware, RoleController.createRole);
router.put('/roles/:id', authMiddleware, RoleController.updateRole);
router.delete('/roles/:id', authMiddleware, RoleController.deleteRole);
router.get('/servers/:serverId/roles', authMiddleware, RoleController.getServerRoles);
router.post('/roles/:roleId/assign', authMiddleware, RoleController.assignRole);
router.post('/roles/:roleId/remove', authMiddleware, RoleController.removeRole);

export default router; 