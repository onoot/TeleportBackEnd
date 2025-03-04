import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { Role } from '../entities/Role';
import { Server } from '../entities/Server';
import { ServerMember } from '../entities/ServerMember';
import { Permission, DefaultRole } from '../types/role';
import { AppDataSource } from '../data-source';

export class RoleController {
  private static instance: RoleController | null = null;
  private roleRepository!: Repository<Role>;
  private serverRepository!: Repository<Server>;
  private memberRepository!: Repository<ServerMember>;
  private initialized = false;

  private constructor() {}

  public static async getInstance(): Promise<RoleController> {
    if (!RoleController.instance) {
      const controller = new RoleController();
      await controller.initialize();
      RoleController.instance = controller;
    }
    return RoleController.instance;
  }

  private async initialize() {
    if (this.initialized) return;

    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }

      this.roleRepository = AppDataSource.getRepository(Role);
      this.serverRepository = AppDataSource.getRepository(Server);
      this.memberRepository = AppDataSource.getRepository(ServerMember);
      this.initialized = true;
      console.log('RoleController initialized successfully');
    } catch (error) {
      console.error('Failed to initialize RoleController:', error);
      throw error;
    }
  }

  // Создание новой роли
  async createRole(req: Request, res: Response) {
    try {
      const serverId = parseInt(req.params.serverId);
      const { name, permissions, position } = req.body;

      const server = await this.serverRepository.findOne({
        where: { id: serverId }
      });

      if (!server) {
        return res.status(404).json({ message: 'Server not found' });
      }

      const role = new Role();
      role.name = name;
      role.permissions = permissions;
      role.position = position;
      role.server_id = serverId;
      role.is_deletable = true;

      const savedRole = await this.roleRepository.save(role);
      res.status(201).json(savedRole);
    } catch (error) {
      console.error('Error creating role:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Обновление роли
  async updateRole(req: Request, res: Response) {
    try {
      const roleId = parseInt(req.params.id);
      const { name, permissions, position } = req.body;

      const role = await this.roleRepository.findOne({
        where: { id: roleId }
      });

      if (!role) {
        return res.status(404).json({ message: 'Role not found' });
      }

      if (role.default_role) {
        return res.status(403).json({ message: 'Cannot modify default roles' });
      }

      if (name) role.name = name;
      if (permissions) role.permissions = permissions;
      if (position !== undefined) role.position = position;

      const updatedRole = await this.roleRepository.save(role);
      res.json(updatedRole);
    } catch (error) {
      console.error('Error updating role:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Удаление роли
  async deleteRole(req: Request, res: Response) {
    try {
      const roleId = parseInt(req.params.id);

      const role = await this.roleRepository.findOne({
        where: { id: roleId }
      });

      if (!role) {
        return res.status(404).json({ message: 'Role not found' });
      }

      if (!role.is_deletable) {
        return res.status(403).json({ message: 'Cannot delete default roles' });
      }

      await this.roleRepository.remove(role);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting role:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Получение всех ролей сервера
  async getServerRoles(req: Request, res: Response) {
    try {
      const serverId = parseInt(req.params.serverId);

      const roles = await this.roleRepository.find({
        where: { server_id: serverId },
        order: { position: 'DESC' }
      });

      res.json(roles);
    } catch (error) {
      console.error('Error getting server roles:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Назначение роли участнику
  async assignRole(req: Request, res: Response) {
    try {
      const roleId = parseInt(req.params.roleId);
      const { memberId } = req.body;

      const member = await this.memberRepository.findOne({
        where: { id: memberId },
        relations: ['roles']
      });

      const role = await this.roleRepository.findOne({
        where: { id: roleId }
      });

      if (!member || !role) {
        return res.status(404).json({ message: 'Member or role not found' });
      }

      member.roles.push(role);
      await this.memberRepository.save(member);

      res.json({ message: 'Role assigned successfully' });
    } catch (error) {
      console.error('Error assigning role:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // Удаление роли у участника
  async removeRole(req: Request, res: Response) {
    try {
      const roleId = parseInt(req.params.roleId);
      const { memberId } = req.body;

      const member = await this.memberRepository.findOne({
        where: { id: memberId },
        relations: ['roles']
      });

      if (!member) {
        return res.status(404).json({ message: 'Member not found' });
      }

      member.roles = member.roles.filter(role => role.id !== roleId);
      await this.memberRepository.save(member);

      res.json({ message: 'Role removed successfully' });
    } catch (error) {
      console.error('Error removing role:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
} 