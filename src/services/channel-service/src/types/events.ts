export enum NotificationType {
  SERVER_UPDATE = 'server_update',
  SERVER_DELETE = 'server_delete',
  CHANNEL_CREATE = 'channel_create',
  CHANNEL_UPDATE = 'channel_update',
  CHANNEL_DELETE = 'channel_delete',
  VOICE_ROOM_UPDATE = 'voice_room_update',
  MEMBER_JOIN = 'member_join',
  MEMBER_LEAVE = 'member_leave',
  ROLE_UPDATE = 'role_update'
}

export interface BaseEvent {
  type: NotificationType;
  timestamp: string;
  serverId: number;
}

export interface ServerEvent extends BaseEvent {
  type: NotificationType.SERVER_UPDATE | NotificationType.SERVER_DELETE;
  data: {
    name?: string;
    description?: string;
    icon?: string;
  };
}

export interface ChannelEvent extends BaseEvent {
  type: NotificationType.CHANNEL_CREATE | NotificationType.CHANNEL_UPDATE | NotificationType.CHANNEL_DELETE;
  data: {
    channelId: number;
    name?: string;
    type?: string;
    categoryId?: number;
  };
}

export interface VoiceRoomEvent extends BaseEvent {
  type: NotificationType.VOICE_ROOM_UPDATE;
  data: {
    channelId: number;
    roomId: string;
    participants: {
      userId: number;
      status: 'joined' | 'left';
    }[];
  };
}

export interface MemberEvent extends BaseEvent {
  type: NotificationType.MEMBER_JOIN | NotificationType.MEMBER_LEAVE;
  data: {
    userId: number;
    roles?: number[];
  };
}

export interface RoleEvent extends BaseEvent {
  type: NotificationType.ROLE_UPDATE;
  data: {
    roleId: number;
    name?: string;
    permissions?: string[];
  };
}

export type NotificationEvent = 
  | ServerEvent 
  | ChannelEvent 
  | VoiceRoomEvent 
  | MemberEvent 
  | RoleEvent; 