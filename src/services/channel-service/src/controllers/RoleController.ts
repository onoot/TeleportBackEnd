import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { Role, Permission, DefaultRole } from '../entities/Role';
import { Server } from '../entities/Server';
import { ServerMember } from '../entities/ServerMember';

export class RoleController {
  // Создание новой роли
  static async createRole(req: Request, res: Response) {
    try {
      const { name, permissions, position } = req.body;
      const serverId = parseInt(req.params.serverId);
      const userId = req.user.id;

      const serverRepo = getRepository(Server);
      const memberRepo = getRepository(ServerMember);
      const roleRepo = getRepository(Role);

      // Проверяем права пользователя
      const member = await memberRepo.findOne({
        where: { server_id: serverId, user_id: userId },
        relations: ['roles']
      });

      if (!member || !member.roles.some(role => 
        role.permissions.includes(Permission.MANAGE_ROLES)
      )) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      // Создаем роль
      const role = new Role();
      role.name = name;
      role.server_id = serverId;
      role.permissions = permissions;
      role.position = position;
      role.is_deletable = true;

      const savedRole = await roleRepo.save(role);
      res.status(201).json(savedRole);
    } catch (error) {
      console.error('Error creating role:', error);
      res.status(500).json({ message: 'Error creating role' });
    }
  }

  // Обновление роли
  static async updateRole(req: Request, res: Response) {
    try {
      const { name, permissions, position } = req.body;
      const roleId = parseInt(req.params.id);
      const userId = req.user.id;

      const roleRepo = getRepository(Role);
      const memberRepo = getRepository(ServerMember);

      const role = await roleRepo.findOne({
        where: { id: roleId },
        relations: ['server']
      });

      if (!role) {
        return res.status(404).json({ message: 'Role not found' });
      }

      // Проверяем права пользователя
      const member = await memberRepo.findOne({
        where: { server_id: role.server_id, user_id: userId },
        relations: ['roles']
      });

      if (!member || !member.roles.some(r => 
        r.permissions.includes(Permission.MANAGE_ROLES)
      )) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      // Нельзя изменять дефолтные роли
      if (role.default_role) {
        return res.status(403).json({ message: 'Cannot modify default roles' });
      }

      role.name = name || role.name;
      role.permissions = permissions || role.permissions;
      role.position = position ?? role.position;

      const updatedRole = await roleRepo.save(role);
      res.json(updatedRole);
    } catch (error) {
      console.error('Error updating role:', error);
      res.status(500).json({ message: 'Error updating role' });
    }
  }

  // Удаление роли
  static async deleteRole(req: Request, res: Response) {
    try {
      const roleId = parseInt(req.params.id);
      const userId = req.user.id;

      const roleRepo = getRepository(Role);
      const memberRepo = getRepository(ServerMember);

      const role = await roleRepo.findOne({
        where: { id: roleId },
        relations: ['server']
      });

      if (!role) {
        return res.status(404).json({ message: 'Role not found' });
      }

      // Проверяем права пользователя
      const member = await memberRepo.findOne({
        where: { server_id: role.server_id, user_id: userId },
        relations: ['roles']
      });

      if (!member || !member.roles.some(r => 
        r.permissions.includes(Permission.MANAGE_ROLES)
      )) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      // Нельзя удалять дефолтные роли
      if (!role.is_deletable) {
        return res.status(403).json({ message: 'Cannot delete default roles' });
      }

      await roleRepo.remove(role);
      res.json({ message: 'Role deleted successfully' });
    } catch (error) {
      console.error('Error deleting role:', error);
      res.status(500).json({ message: 'Error deleting role' });
    }
  }

  // Получение всех ролей сервера
  static async getServerRoles(req: Request, res: Response) {
    try {
      const serverId = parseInt(req.params.serverId);
      const userId = req.user.id;

      const memberRepo = getRepository(ServerMember);
      const roleRepo = getRepository(Role);

      // Проверяем, является ли пользователь участником сервера
      const member = await memberRepo.findOne({
        where: { server_id: serverId, user_id: userId }
      });

      if (!member) {
        return res.status(403).json({ message: 'Not a member of this server' });
      }

      const roles = await roleRepo.find({
        where: { server_id: serverId },
        order: { position: 'DESC' }
      });

      res.json(roles);
    } catch (error) {
      console.error('Error getting roles:', error);
      res.status(500).json({ message: 'Error getting roles' });
    }
  }

  // Назначение роли участнику
  static async assignRole(req: Request, res: Response) {
    try {
      const { userId: targetUserId } = req.body;
      const roleId = parseInt(req.params.roleId);
      const userId = req.user.id;

      const roleRepo = getRepository(Role);
      const memberRepo = getRepository(ServerMember);

      const role = await roleRepo.findOne({
        where: { id: roleId },
        relations: ['server']
      });

      if (!role) {
        return res.status(404).json({ message: 'Role not found' });
      }

      // Проверяем права пользователя
      const member = await memberRepo.findOne({
        where: { server_id: role.server_id, user_id: userId },
        relations: ['roles']
      });

      if (!member || !member.roles.some(r => 
        r.permissions.includes(Permission.MANAGE_ROLES)
      )) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      // Находим целевого пользователя
      const targetMember = await memberRepo.findOne({
        where: { server_id: role.server_id, user_id: targetUserId },
        relations: ['roles']
      });

      if (!targetMember) {
        return res.status(404).json({ message: 'Target user not found in server' });
      }

      // Добавляем роль
      targetMember.roles = [...targetMember.roles, role];
      await memberRepo.save(targetMember);

      res.json({ message: 'Role assigned successfully' });
    } catch (error) {
      console.error('Error assigning role:', error);
      res.status(500).json({ message: 'Error assigning role' });
    }
  }

  // Удаление роли у участника
  static async removeRole(req: Request, res: Response) {
    try {
      const { userId: targetUserId } = req.body;
      const roleId = parseInt(req.params.roleId);
      const userId = req.user.id;

      const roleRepo = getRepository(Role);
      const memberRepo = getRepository(ServerMember);

      const role = await roleRepo.findOne({
        where: { id: roleId },
        relations: ['server']
      });

      if (!role) {
        return res.status(404).json({ message: 'Role not found' });
      }

      // Проверяем права пользователя
      const member = await memberRepo.findOne({
        where: { server_id: role.server_id, user_id: userId },
        relations: ['roles']
      });

      if (!member || !member.roles.some(r => 
        r.permissions.includes(Permission.MANAGE_ROLES)
      )) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      // Находим целевого пользователя
      const targetMember = await memberRepo.findOne({
        where: { server_id: role.server_id, user_id: targetUserId },
        relations: ['roles']
      });

      if (!targetMember) {
        return res.status(404).json({ message: 'Target user not found in server' });
      }

      // Нельзя удалять дефолтную роль участника
      if (role.default_role === DefaultRole.MEMBER) {
        return res.status(403).json({ message: 'Cannot remove default member role' });
      }

      // Удаляем роль
      targetMember.roles = targetMember.roles.filter(r => r.id !== role.id);
      await memberRepo.save(targetMember);

      res.json({ message: 'Role removed successfully' });
    } catch (error) {
      console.error('Error removing role:', error);
      res.status(500).json({ message: 'Error removing role' });
    }
  }
} 