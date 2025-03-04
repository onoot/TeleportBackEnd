import { Response } from 'express';
import { getRepository, FindOptionsWhere } from 'typeorm';
import { Category } from '../entities/Category';
import { Server } from '../entities/Server';
import { ServerMember, MemberRole } from '../entities/ServerMember';
import AuthenticatedRequest from '../types/request';

export class CategoryController {
  // Создание новой категории
  static async createCategory(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, position } = req.body;
      const serverId = parseInt(req.params.serverId);
      
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = parseInt(req.user.id);

      const serverRepo = getRepository(Server);
      const memberRepo = getRepository(ServerMember);
      const categoryRepo = getRepository(Category);

      // Проверяем права пользователя
      const member = await memberRepo.findOne({
        where: { 
          server_id: serverId, 
          user_id: userId 
        } as FindOptionsWhere<ServerMember>
      });

      if (!member || (member.role !== MemberRole.OWNER && member.role !== MemberRole.ADMIN)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      // Создаем категорию
      const category = new Category();
      category.name = name;
      category.position = position;
      category.server_id = serverId;

      const savedCategory = await categoryRepo.save(category);
      res.status(201).json(savedCategory);
    } catch (error) {
      console.error('Error creating category:', error);
      res.status(500).json({ message: 'Error creating category' });
    }
  }

  // Обновление категории
  static async updateCategory(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, position } = req.body;
      const categoryId = parseInt(req.params.id);
      
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = parseInt(req.user.id);

      const categoryRepo = getRepository(Category);
      const memberRepo = getRepository(ServerMember);

      const category = await categoryRepo.findOne({
        where: { id: categoryId }
      });

      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      // Проверяем права пользователя
      const member = await memberRepo.findOne({
        where: { 
          server_id: category.server_id, 
          user_id: userId 
        } as FindOptionsWhere<ServerMember>
      });

      if (!member || (member.role !== MemberRole.OWNER && member.role !== MemberRole.ADMIN)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      category.name = name || category.name;
      category.position = position ?? category.position;

      const updatedCategory = await categoryRepo.save(category);
      res.json(updatedCategory);
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({ message: 'Error updating category' });
    }
  }

  // Удаление категории
  static async deleteCategory(req: AuthenticatedRequest, res: Response) {
    try {
      const categoryId = parseInt(req.params.id);
      
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = parseInt(req.user.id);

      const categoryRepo = getRepository(Category);
      const memberRepo = getRepository(ServerMember);

      const category = await categoryRepo.findOne({
        where: { id: categoryId }
      });

      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      // Проверяем права пользователя
      const member = await memberRepo.findOne({
        where: { 
          server_id: category.server_id, 
          user_id: userId 
        } as FindOptionsWhere<ServerMember>
      });

      if (!member || (member.role !== MemberRole.OWNER && member.role !== MemberRole.ADMIN)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      await categoryRepo.remove(category);
      res.json({ message: 'Category deleted successfully' });
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({ message: 'Error deleting category' });
    }
  }

  // Получение всех категорий сервера
  static async getServerCategories(req: AuthenticatedRequest, res: Response) {
    try {
      const serverId = parseInt(req.params.serverId);
      
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = parseInt(req.user.id);

      const memberRepo = getRepository(ServerMember);
      const categoryRepo = getRepository(Category);

      // Проверяем, является ли пользователь участником сервера
      const member = await memberRepo.findOne({
        where: { 
          server_id: serverId, 
          user_id: userId 
        } as FindOptionsWhere<ServerMember>
      });

      if (!member) {
        return res.status(403).json({ message: 'Not a member of this server' });
      }

      const categories = await categoryRepo.find({
        where: { server_id: serverId },
        relations: ['channels'],
        order: { position: 'ASC' }
      });

      res.json(categories);
    } catch (error) {
      console.error('Error getting categories:', error);
      res.status(500).json({ message: 'Error getting categories' });
    }
  }
} 