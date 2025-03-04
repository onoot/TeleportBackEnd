import { Request, Response } from 'express';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Server } from '../entities/Server';
import { ServerMember } from '../entities/ServerMember';
import { Category } from '../entities/Category';
import { Channel } from '../entities/Channel';
import { Role } from '../entities/Role';
import { Permission, DefaultRole } from '../types/role';
import { RoleService } from '../services/RoleService';
import { R2Service } from '../services/R2Service';
import { AppDataSource } from '../data-source';
import { notificationService } from '../services/NotificationService';
import { NotificationType } from '../types/events';
import { AuthenticatedRequest } from '../types/request';

export class ServerController {
  private static instance: ServerController | null = null;
  private serverRepository!: Repository<Server>;
  private memberRepository!: Repository<ServerMember>;
  private categoryRepository!: Repository<Category>;
  private channelRepository!: Repository<Channel>;
  private r2Service!: R2Service;
  private roleService!: RoleService;
  private initialized = false;

  private constructor() {}

  public static async getInstance(): Promise<ServerController> {
    if (!ServerController.instance) {
      const controller = new ServerController();
      await controller.initialize();
      ServerController.instance = controller;
    }
    return ServerController.instance;
  }

  private async initialize() {
    if (this.initialized) return;

    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }

      this.serverRepository = AppDataSource.getRepository(Server);
      this.memberRepository = AppDataSource.getRepository(ServerMember);
      this.categoryRepository = AppDataSource.getRepository(Category);
      this.channelRepository = AppDataSource.getRepository(Channel);
      this.r2Service = await R2Service.getInstance();
      this.roleService = await RoleService.getInstance();
      this.initialized = true;
      console.log('ServerController initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ServerController:', error);
      throw error;
    }
  }

  async createServer(req: AuthenticatedRequest, res: Response) {
    try {
      const { name } = req.body;
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = parseInt(req.user.id);

      const server = new Server();
      server.name = name;
      server.owner_id = userId.toString();

      const savedServer = await this.serverRepository.save(server);

      // Создаем роли по умолчанию
      await this.roleService.createDefaultRoles(savedServer.id);

      // Создаем участника сервера (владельца)
      const member = new ServerMember();
      member.user_id = userId;
      member.server_id = savedServer.id;
      await this.memberRepository.save(member);

      // Создаем категорию по умолчанию
      const category = new Category();
      category.name = 'General';
      category.server_id = savedServer.id;
      category.position = 0;
      const savedCategory = await this.categoryRepository.save(category);

      // Создаем текстовый канал по умолчанию
      const channel = new Channel();
      channel.name = 'general';
      channel.category_id = savedCategory.id;
      channel.position = 0;
      await this.channelRepository.save(channel);

      res.status(201).json(savedServer);
    } catch (error) {
      console.error('Error creating server:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async getServer(req: AuthenticatedRequest, res: Response) {
    try {
      const serverId = parseInt(req.params.id);
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = parseInt(req.user.id);

      const server = await this.serverRepository.findOne({
        where: { id: serverId }
      });

      if (!server) {
        return res.status(404).json({ message: 'Server not found' });
      }

      // Проверяем, является ли пользователь участником сервера
      const member = await this.memberRepository.findOne({
        where: { 
          server_id: serverId, 
          user_id: userId 
        } as FindOptionsWhere<ServerMember>
      });

      if (!member) {
        return res.status(403).json({ message: 'Not a member of this server' });
      }

      res.json(server);
    } catch (error) {
      console.error('Error getting server:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async updateServer(req: AuthenticatedRequest, res: Response) {
    try {
      const serverId = parseInt(req.params.id);
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = parseInt(req.user.id);
      const { name } = req.body;

      const server = await this.serverRepository.findOne({
        where: { id: serverId }
      });

      if (!server) {
        return res.status(404).json({ message: 'Server not found' });
      }

      // Проверяем права на управление сервером
      if (parseInt(server.owner_id) !== userId) {
        const hasPermission = await this.roleService.hasPermission(
          userId,
          serverId,
          Permission.MANAGE_SERVER
        );

        if (!hasPermission) {
          return res.status(403).json({ message: 'Insufficient permissions' });
        }
      }

      server.name = name;
      const updatedServer = await this.serverRepository.save(server);

      res.json(updatedServer);
    } catch (error) {
      console.error('Error updating server:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async deleteServer(req: AuthenticatedRequest, res: Response) {
    try {
      const serverId = parseInt(req.params.id);
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = parseInt(req.user.id);

      const server = await this.serverRepository.findOne({
        where: { id: serverId }
      });

      if (!server) {
        return res.status(404).json({ message: 'Server not found' });
      }

      if (parseInt(server.owner_id) !== userId) {
        return res.status(403).json({ message: 'Only server owner can delete the server' });
      }

      await this.serverRepository.remove(server);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting server:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async joinServer(req: AuthenticatedRequest, res: Response) {
    try {
      const serverId = parseInt(req.params.id);
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = parseInt(req.user.id);

      const server = await this.serverRepository.findOne({
        where: { id: serverId }
      });

      if (!server) {
        return res.status(404).json({ message: 'Server not found' });
      }

      // Проверяем, не является ли пользователь уже участником
      const existingMember = await this.memberRepository.findOne({
        where: { 
          server_id: serverId, 
          user_id: userId 
        } as FindOptionsWhere<ServerMember>
      });

      if (existingMember) {
        return res.status(400).json({ message: 'Already a member of this server' });
      }

      // Создаем нового участника
      const member = new ServerMember();
      member.user_id = userId;
      member.server_id = serverId;

      // Получаем роль участника по умолчанию
      const memberRole = await this.roleService.getDefaultRole(serverId, DefaultRole.MEMBER);
      if (memberRole) {
        member.roles = [memberRole];
      }

      await this.memberRepository.save(member);
      res.status(201).json({ message: 'Successfully joined the server' });
    } catch (error) {
      console.error('Error joining server:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async getServerMembers(req: AuthenticatedRequest, res: Response) {
    try {
      const serverId = parseInt(req.params.id);
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = parseInt(req.user.id);

      // Проверяем, является ли пользователь участником сервера
      const member = await this.memberRepository.findOne({
        where: { 
          server_id: serverId, 
          user_id: userId 
        } as FindOptionsWhere<ServerMember>
      });

      if (!member) {
        return res.status(403).json({ message: 'Not a member of this server' });
      }

      const members = await this.memberRepository.find({
        where: { server_id: serverId },
        relations: ['roles']
      });

      res.json(members);
    } catch (error) {
      console.error('Error getting server members:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async uploadServerIcon(req: AuthenticatedRequest, res: Response) {
    try {
      const serverId = parseInt(req.params.id);
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = parseInt(req.user.id);
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const server = await this.serverRepository.findOne({
        where: { id: serverId }
      });

      if (!server) {
        return res.status(404).json({ message: 'Server not found' });
      }

      // Проверяем права на управление сервером
      if (parseInt(server.owner_id) !== userId) {
        const hasPermission = await this.roleService.hasPermission(
          userId,
          serverId,
          Permission.MANAGE_SERVER
        );

        if (!hasPermission) {
          return res.status(403).json({ message: 'Insufficient permissions' });
        }
      }

      const iconUrl = await this.r2Service.uploadServerIcon(file.buffer, file.mimetype);
      server.icon_url = iconUrl;
      await this.serverRepository.save(server);

      res.json({ iconUrl });
    } catch (error) {
      console.error('Error uploading server icon:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
} 