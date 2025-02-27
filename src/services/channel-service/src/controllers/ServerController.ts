import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { Server } from '../entities/Server';
import { Category } from '../entities/Category';
import { Channel } from '../entities/Channel';
import { ServerMember, MemberRole } from '../entities/ServerMember';
import { ChannelType } from '../entities/Channel';
import { v4 as uuidv4 } from 'uuid';
import { callService } from '../services/CallService';
import { RoleService } from '../services/RoleService';
import { DefaultRole } from '../entities/Role';
import { AppDataSource } from '../data-source';
import { notificationService } from '../services/NotificationService';
import { NotificationType } from '../types/events';

export class ServerController {
  private static serverRepository = AppDataSource.getRepository(Server);

  // Создание нового сервера
  static async createServer(req: Request, res: Response) {
    try {
      const { name, description, icon } = req.body;
      const userId = req.user.id;

      const serverRepo = getRepository(Server);
      const categoryRepo = getRepository(Category);
      const channelRepo = getRepository(Channel);
      const memberRepo = getRepository(ServerMember);

      // Создаем сервер
      const server = new Server();
      server.name = name;
      server.description = description;
      server.icon = icon;
      server.owner_id = userId;
      server.invite_code = uuidv4();
      
      const savedServer = await serverRepo.save(server);

      // Создаем дефолтные роли
      const roles = await RoleService.createDefaultRoles(savedServer.id);

      // Создаем запись о владельце сервера
      const ownerMember = new ServerMember();
      ownerMember.user_id = userId;
      ownerMember.server_id = savedServer.id;
      ownerMember.roles = [roles.find(role => role.default_role === DefaultRole.OWNER)!];
      await memberRepo.save(ownerMember);

      // Создаем категорию по умолчанию
      const defaultCategory = new Category();
      defaultCategory.name = 'General';
      defaultCategory.position = 0;
      defaultCategory.server_id = savedServer.id;
      const savedCategory = await categoryRepo.save(defaultCategory);

      // Создаем текстовый канал по умолчанию
      const textChannel = new Channel();
      textChannel.name = 'general';
      textChannel.type = ChannelType.TEXT;
      textChannel.position = 0;
      textChannel.category_id = savedCategory.id;
      await channelRepo.save(textChannel);

      // Создаем голосовой канал по умолчанию
      const voiceChannel = new Channel();
      voiceChannel.name = 'General Voice';
      voiceChannel.type = ChannelType.VOICE;
      voiceChannel.position = 1;
      voiceChannel.category_id = savedCategory.id;
      
      // Создаем комнату для голосового канала
      const room = await callService.createRoom();
      voiceChannel.room_id = room.id;
      
      await channelRepo.save(voiceChannel);

      // Отправляем уведомление о создании сервера
      await notificationService.sendNotification({
        type: NotificationType.SERVER_UPDATE,
        serverId: savedServer.id,
        timestamp: new Date().toISOString(),
        data: {
          name: savedServer.name,
          description: savedServer.description
        }
      });

      res.status(201).json({
        message: 'Server created successfully',
        server: savedServer
      });
    } catch (error) {
      console.error('Error creating server:', error);
      res.status(500).json({ message: 'Error creating server' });
    }
  }

  // Получение информации о сервере
  static async getServer(req: Request, res: Response) {
    try {
      const serverId = parseInt(req.params.id);
      const userId = req.user.id;

      const serverRepo = getRepository(Server);
      const memberRepo = getRepository(ServerMember);

      // Проверяем, является ли пользователь участником сервера
      const member = await memberRepo.findOne({
        where: { server_id: serverId, user_id: userId }
      });

      if (!member) {
        return res.status(403).json({ message: 'Not a member of this server' });
      }

      const server = await serverRepo.findOne({
        where: { id: serverId },
        relations: ['categories', 'categories.channels']
      });

      if (!server) {
        return res.status(404).json({ message: 'Server not found' });
      }

      res.json(server);
    } catch (error) {
      console.error('Error getting server:', error);
      res.status(500).json({ message: 'Error getting server' });
    }
  }

  // Обновление информации о сервере
  static async updateServer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, icon } = req.body;
      const userId = req.user.id;

      const server = await ServerController.serverRepository.findOne({ where: { id: parseInt(id) } });

      if (!server) {
        return res.status(404).json({ message: 'Server not found' });
      }

      if (server.owner_id !== userId) {
        return res.status(403).json({ message: 'Not authorized to update server' });
      }

      if (name) server.name = name;
      if (description) server.description = description;
      if (icon) server.icon = icon;

      const updatedServer = await ServerController.serverRepository.save(server);

      // Отправляем уведомление об обновлении сервера
      await notificationService.sendNotification({
        type: NotificationType.SERVER_UPDATE,
        serverId: updatedServer.id,
        timestamp: new Date().toISOString(),
        data: {
          name: updatedServer.name,
          description: updatedServer.description,
          icon: updatedServer.icon
        }
      });

      res.json(updatedServer);
    } catch (error) {
      console.error('Error updating server:', error);
      res.status(500).json({ message: 'Failed to update server' });
    }
  }

  // Удаление сервера
  static async deleteServer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const server = await ServerController.serverRepository.findOne({ where: { id: parseInt(id) } });

      if (!server) {
        return res.status(404).json({ message: 'Server not found' });
      }

      if (server.owner_id !== userId) {
        return res.status(403).json({ message: 'Not authorized to delete server' });
      }

      // Отправляем уведомление об удалении сервера
      await notificationService.sendNotification({
        type: NotificationType.SERVER_DELETE,
        serverId: server.id,
        timestamp: new Date().toISOString(),
        data: {}
      });

      await ServerController.serverRepository.remove(server);

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting server:', error);
      res.status(500).json({ message: 'Failed to delete server' });
    }
  }

  // Присоединение к серверу по коду приглашения
  static async joinServer(req: Request, res: Response) {
    try {
      const { inviteCode } = req.body;
      const userId = req.user.id;

      const serverRepo = getRepository(Server);
      const memberRepo = getRepository(ServerMember);

      const server = await serverRepo.findOne({
        where: { invite_code: inviteCode }
      });

      if (!server) {
        return res.status(404).json({ message: 'Invalid invite code' });
      }

      // Проверяем, не является ли пользователь уже участником
      const existingMember = await memberRepo.findOne({
        where: { server_id: server.id, user_id: userId }
      });

      if (existingMember) {
        return res.status(400).json({ message: 'Already a member of this server' });
      }

      // Создаем нового участника
      const member = new ServerMember();
      member.user_id = userId;
      member.server_id = server.id;
      member.role = MemberRole.MEMBER;

      await memberRepo.save(member);
      res.status(201).json({ message: 'Joined server successfully' });
    } catch (error) {
      console.error('Error joining server:', error);
      res.status(500).json({ message: 'Error joining server' });
    }
  }

  static async getServerMembers(req: Request, res: Response) {
    try {
      const serverId = parseInt(req.params.id);
      const userId = req.user.id;

      const memberRepo = getRepository(ServerMember);

      // Проверяем, является ли пользователь участником сервера
      const member = await memberRepo.findOne({
        where: { server_id: serverId, user_id: userId }
      });

      if (!member) {
        return res.status(403).json({ message: 'Not a member of this server' });
      }

      const members = await memberRepo.find({
        where: { server_id: serverId },
        relations: ['roles']
      });

      res.json(members);
    } catch (error) {
      console.error('Error getting server members:', error);
      res.status(500).json({ message: 'Error getting server members' });
    }
  }
} 