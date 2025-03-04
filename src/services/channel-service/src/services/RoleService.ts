import { Repository } from 'typeorm';
import { Role } from '../entities/Role';
import { Server } from '../entities/Server';
import { ServerMember } from '../entities/ServerMember';
import { Permission, DefaultRole } from '../types/role';
import { AppDataSource } from '../data-source';

export class RoleService {
  private static instance: RoleService | null = null;
  private roleRepository!: Repository<Role>;
  private serverRepository!: Repository<Server>;
  private memberRepository!: Repository<ServerMember>;
  private initialized = false;

  private constructor() {}

  public static async getInstance(): Promise<RoleService> {
    if (!RoleService.instance) {
      const service = new RoleService();
      await service.initialize();
      RoleService.instance = service;
    }
    return RoleService.instance;
  }

  private async initialize() {
    if (this.initialized) return;

    try {
      // Ждем инициализации AppDataSource если необходимо
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }

      this.roleRepository = AppDataSource.getRepository(Role);
      this.serverRepository = AppDataSource.getRepository(Server);
      this.memberRepository = AppDataSource.getRepository(ServerMember);
      this.initialized = true;
      console.log('RoleService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize RoleService:', error);
      throw error;
    }
  }

  // Создание дефолтных ролей для сервера
  async createDefaultRoles(serverId: number): Promise<Role[]> {
    const roles: Role[] = [];

    // Создаем роль владельца
    const ownerRole = new Role();
    ownerRole.name = 'Owner';
    ownerRole.permissions = Object.values(Permission);
    ownerRole.position = 0;
    ownerRole.server_id = serverId;
    ownerRole.is_deletable = false;
    ownerRole.default_role = DefaultRole.OWNER;
    roles.push(await this.roleRepository.save(ownerRole));

    // Создаем роль участника
    const memberRole = new Role();
    memberRole.name = 'Member';
    const memberPermissions = [
      Permission.VIEW_CHANNELS,
      Permission.SEND_MESSAGES,
      Permission.CREATE_INVITE
    ];
    memberRole.permissions = memberPermissions;
    memberRole.position = 1;
    memberRole.server_id = serverId;
    memberRole.is_deletable = false;
    memberRole.default_role = DefaultRole.MEMBER;
    roles.push(await this.roleRepository.save(memberRole));

    return roles;
  }

  // Проверка наличия разрешения у пользователя
  async hasPermission(userId: number, serverId: number, permission: Permission): Promise<boolean> {
    const member = await this.memberRepository.findOne({
      where: { user_id: userId, server_id: serverId },
      relations: ['roles']
    });

    if (!member) {
      return false;
    }

    return member.roles.some(role => role.permissions.includes(permission));
  }

  // Получение дефолтной роли сервера
  async getDefaultRole(serverId: number, defaultRole: DefaultRole): Promise<Role | undefined> {
    const role = await this.roleRepository.findOne({
      where: {
        server_id: serverId,
        default_role: defaultRole
      }
    });
    return role || undefined;
  }

  // Назначение роли участнику
  async assignRoleToMember(memberId: number, roleId: number): Promise<void> {
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
  async removeRoleFromMember(memberId: number, roleId: number): Promise<void> {
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
  async getServerRoles(serverId: number): Promise<Role[]> {
    return this.roleRepository.find({
      where: { server_id: serverId },
      order: { position: 'DESC' }
    });
  }

  // Создание новой роли
  async createRole(
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
  async updateRole(
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
  async deleteRole(roleId: number): Promise<void> {
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