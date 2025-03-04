export enum Permission {
  MANAGE_SERVER = 'MANAGE_SERVER',
  MANAGE_CHANNELS = 'MANAGE_CHANNELS',
  MANAGE_ROLES = 'MANAGE_ROLES',
  MANAGE_MESSAGES = 'MANAGE_MESSAGES',
  SEND_MESSAGES = 'SEND_MESSAGES',
  READ_MESSAGES = 'READ_MESSAGES',
  CONNECT = 'CONNECT',
  SPEAK = 'SPEAK',
  STREAM = 'STREAM',
  CREATE_INVITE = 'CREATE_INVITE',
  VIEW_CHANNELS = 'VIEW_CHANNELS'
}

export enum DefaultRole {
  OWNER = 'owner',
  MEMBER = 'member'
}

export interface RoleData {
  name: string;
  permissions: Permission[];
  position: number;
  color?: string;
  is_deletable: boolean;
} 