import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { Channel, ChannelType } from '../entities/Channel';
import { Category } from '../entities/Category';
import { ServerMember, MemberRole } from '../entities/ServerMember';
import { callService } from '../services/CallService';

export class ChannelController {
  // Создание нового канала
  static async createChannel(req: Request, res: Response) {
    try {
      const { name, type, position } = req.body;
      const categoryId = parseInt(req.params.categoryId);
      const userId = req.user.id;

      const categoryRepo = getRepository(Category);
      const memberRepo = getRepository(ServerMember);
      const channelRepo = getRepository(Channel);

      const category = await categoryRepo.findOne({
        where: { id: categoryId },
        relations: ['server']
      });

      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      // Проверяем права пользователя
      const member = await memberRepo.findOne({
        where: { server_id: category.server_id, user_id: userId }
      });

      if (!member || (member.role !== MemberRole.OWNER && member.role !== MemberRole.ADMIN)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      // Создаем канал
      const channel = new Channel();
      channel.name = name;
      channel.type = type;
      channel.position = position;
      channel.category_id = categoryId;

      // Если это голосовой канал, создаем комнату
      if (type === ChannelType.VOICE) {
        const room = await callService.createRoom();
        channel.room_id = room.id;
      }

      const savedChannel = await channelRepo.save(channel);
      res.status(201).json(savedChannel);
    } catch (error) {
      console.error('Error creating channel:', error);
      res.status(500).json({ message: 'Error creating channel' });
    }
  }

  // Обновление канала
  static async updateChannel(req: Request, res: Response) {
    try {
      const { name, position } = req.body;
      const channelId = parseInt(req.params.id);
      const userId = req.user.id;

      const channelRepo = getRepository(Channel);
      const memberRepo = getRepository(ServerMember);

      const channel = await channelRepo.findOne({
        where: { id: channelId },
        relations: ['category']
      });

      if (!channel) {
        return res.status(404).json({ message: 'Channel not found' });
      }

      // Проверяем права пользователя
      const member = await memberRepo.findOne({
        where: { server_id: channel.category.server_id, user_id: userId }
      });

      if (!member || (member.role !== MemberRole.OWNER && member.role !== MemberRole.ADMIN)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      channel.name = name || channel.name;
      channel.position = position ?? channel.position;

      const updatedChannel = await channelRepo.save(channel);
      res.json(updatedChannel);
    } catch (error) {
      console.error('Error updating channel:', error);
      res.status(500).json({ message: 'Error updating channel' });
    }
  }

  // Удаление канала
  static async deleteChannel(req: Request, res: Response) {
    try {
      const channelId = parseInt(req.params.id);
      const userId = req.user.id;

      const channelRepo = getRepository(Channel);
      const memberRepo = getRepository(ServerMember);

      const channel = await channelRepo.findOne({
        where: { id: channelId },
        relations: ['category']
      });

      if (!channel) {
        return res.status(404).json({ message: 'Channel not found' });
      }

      // Проверяем права пользователя
      const member = await memberRepo.findOne({
        where: { server_id: channel.category.server_id, user_id: userId }
      });

      if (!member || (member.role !== MemberRole.OWNER && member.role !== MemberRole.ADMIN)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      // Если это голосовой канал, удаляем комнату
      if (channel.type === ChannelType.VOICE && channel.room_id) {
        await callService.deleteRoom(channel.room_id);
      }

      await channelRepo.remove(channel);
      res.json({ message: 'Channel deleted successfully' });
    } catch (error) {
      console.error('Error deleting channel:', error);
      res.status(500).json({ message: 'Error deleting channel' });
    }
  }

  // Получение всех каналов категории
  static async getCategoryChannels(req: Request, res: Response) {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const userId = req.user.id;

      const categoryRepo = getRepository(Category);
      const memberRepo = getRepository(ServerMember);
      const channelRepo = getRepository(Channel);

      const category = await categoryRepo.findOne({
        where: { id: categoryId }
      });

      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      // Проверяем, является ли пользователь участником сервера
      const member = await memberRepo.findOne({
        where: { server_id: category.server_id, user_id: userId }
      });

      if (!member) {
        return res.status(403).json({ message: 'Not a member of this server' });
      }

      const channels = await channelRepo.find({
        where: { category_id: categoryId },
        order: { position: 'ASC' }
      });

      res.json(channels);
    } catch (error) {
      console.error('Error getting channels:', error);
      res.status(500).json({ message: 'Error getting channels' });
    }
  }
} 