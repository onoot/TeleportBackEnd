import { getRepository } from 'typeorm';
import { Role, Permission, DefaultRole } from '../entities/Role';
import { Server } from '../entities/Server';
import { ServerMember } from '../entities/ServerMember';
import { config } from '../config';

export class RoleService {
  private static roleRepository = getRepository(Role);
  private static serverRepository = getRepository(Server);
  private static memberRepository = getRepository(ServerMember);

  // Создание дефолтных ролей при создании сервера
  static async createDefaultRoles(serverId: number): Promise<Role[]> {
    const roles: Role[] = [];

    // Создаем роль владельца
    const ownerRole = new Role();
    ownerRole.name = config.defaultRoles.owner.name;
    ownerRole.permissions = config.defaultRoles.owner.permissions as Permission[];
    ownerRole.position = config.defaultRoles.owner.position;
    ownerRole.is_deletable = config.defaultRoles.owner.is_deletable;
    ownerRole.server_id = serverId;
    ownerRole.default_role = DefaultRole.OWNER;
    roles.push(await this.roleRepository.save(ownerRole));

    // Создаем роль участника
    const memberRole = new Role();
    memberRole.name = config.defaultRoles.member.name;
    memberRole.permissions = config.defaultRoles.member.permissions as Permission[];
    memberRole.position = config.defaultRoles.member.position;
    memberRole.is_deletable = config.defaultRoles.member.is_deletable;
    memberRole.server_id = serverId;
    memberRole.default_role = DefaultRole.MEMBER;
    roles.push(await this.roleRepository.save(memberRole));

    return roles;
  }

  // Проверка наличия разрешения у пользователя
  static async hasPermission(userId: number, serverId: number, permission: Permission): Promise<boolean> {
    const member = await this.memberRepository.findOne({
      where: { user_id: userId, server_id: serverId },
      relations: ['roles']
    });

    if (!member) {
      return false;
    }

    return member.roles.some(role => role.permissions.includes(permission));
  }

  // Получение роли по умолчанию
  static async getDefaultRole(serverId: number, defaultRole: DefaultRole): Promise<Role | undefined> {
    const role = await this.roleRepository.findOne({
      where: {
        server_id: serverId,
        default_role: defaultRole
      }
    });
    return role || undefined;
  }

  // Назначение роли участнику
  static async assignRoleToMember(memberId: number, roleId: number): Promise<void> {
    const member = await this.memberRepository.findOne({
      where: { id: memberId },
      relations: ['roles']
    });

    const role = await this.roleRepository.findOne({
      where: { id: roleId }
    });

    if (!member || !role) {
      throw new Error('Member or role not found');
    }

    member.roles.push(role);
    await this.memberRepository.save(member);
  }

  // Удаление роли у участника
  static async removeRoleFromMember(memberId: number, roleId: number): Promise<void> {
    const member = await this.memberRepository.findOne({
      where: { id: memberId },
      relations: ['roles']
    });

    if (!member) {
      throw new Error('Member not found');
    }

    member.roles = member.roles.filter(role => role.id !== roleId);
    await this.memberRepository.save(member);
  }

  // Получение всех ролей сервера
  static async getServerRoles(serverId: number): Promise<Role[]> {
    return this.roleRepository.find({
      where: { server_id: serverId },
      order: { position: 'DESC' }
    });
  }

  // Создание новой роли
  static async createRole(
    serverId: number,
    name: string,
    permissions: Permission[],
    position: number
  ): Promise<Role> {
    const role = new Role();
    role.name = name;
    role.permissions = permissions;
    role.position = position;
    role.server_id = serverId;
    role.is_deletable = true;

    return this.roleRepository.save(role);
  }

  // Обновление роли
  static async updateRole(
    roleId: number,
    name?: string,
    permissions?: Permission[],
    position?: number
  ): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId }
    });

    if (!role) {
      throw new Error('Role not found');
    }

    if (role.default_role) {
      throw new Error('Cannot modify default roles');
    }

    if (name) role.name = name;
    if (permissions) role.permissions = permissions;
    if (position !== undefined) role.position = position;

    return this.roleRepository.save(role);
  }

  // Удаление роли
  static async deleteRole(roleId: number): Promise<void> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId }
    });

    if (!role) {
      throw new Error('Role not found');
    }

    if (!role.is_deletable) {
      throw new Error('Cannot delete default roles');
    }

    await this.roleRepository.remove(role);
  }
} 