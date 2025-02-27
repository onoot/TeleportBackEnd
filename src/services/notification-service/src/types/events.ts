export enum NotificationType {
  // События сообщений
  MESSAGE_CREATED = 'message.created',
  MESSAGE_UPDATED = 'message.updated',
  MESSAGE_DELETED = 'message.deleted',
  MESSAGE_REACTION = 'message.reaction',

  // События звонков
  CALL_INITIATED = 'call.initiated',
  CALL_ACCEPTED = 'call.accepted',
  CALL_REJECTED = 'call.rejected',
  CALL_ENDED = 'call.ended',
  PARTICIPANT_JOINED = 'call.participant.joined',
  PARTICIPANT_LEFT = 'call.participant.left',
  PARTICIPANT_MUTED = 'call.participant.muted',
  PARTICIPANT_UNMUTED = 'call.participant.unmuted',
  PARTICIPANT_VIDEO_ON = 'call.participant.video.on',
  PARTICIPANT_VIDEO_OFF = 'call.participant.video.off',
  PARTICIPANT_SCREEN_SHARE = 'call.participant.screen.share',
  PARTICIPANT_SCREEN_STOP = 'call.participant.screen.stop',

  // События каналов
  CHANNEL_CREATE = 'channel.created',
  CHANNEL_UPDATE = 'channel.updated',
  CHANNEL_DELETE = 'channel.deleted',
  CHANNEL_TYPING = 'channel.typing',

  // События серверов
  SERVER_UPDATE = 'server.updated',
  SERVER_DELETE = 'server.deleted',
  MEMBER_JOIN = 'server.member.joined',
  MEMBER_LEAVE = 'server.member.left',
  ROLE_UPDATE = 'server.role.updated',

  // События пользователей
  USER_ONLINE = 'user.online',
  USER_OFFLINE = 'user.offline',
  USER_TYPING = 'user.typing',
  USER_STOP_TYPING = 'user.stop_typing',
  USER_STATUS_UPDATE = 'user.status.update',
  USER_SETTINGS_UPDATE = 'user.settings.update',
  USER_AVATAR_UPDATE = 'user.avatar.update',

  // Системные события
  SYSTEM_MAINTENANCE = 'system.maintenance',
  SYSTEM_ERROR = 'system.error',
  SYSTEM_UPDATE = 'system.update'
}

export interface BaseNotification {
  id: string;
  type: NotificationType;
  timestamp: number;
  targetUsers: number[];
}

export interface MessageNotification extends BaseNotification {
  type: NotificationType.MESSAGE_CREATED | NotificationType.MESSAGE_UPDATED | NotificationType.MESSAGE_DELETED;
  data: {
    messageId: string;
    channelId: number;
    serverId: number;
    content: string;
    authorId: number;
  };
}

export interface CallNotification extends BaseNotification {
  type: NotificationType.CALL_INITIATED | NotificationType.CALL_ACCEPTED | NotificationType.CALL_REJECTED | NotificationType.CALL_ENDED;
  data: {
    roomId: string;
    channelId: number;
    initiatorId: number;
    participants: number[];
  };
}

export interface ParticipantNotification extends BaseNotification {
  type: NotificationType.PARTICIPANT_JOINED | NotificationType.PARTICIPANT_LEFT | 
        NotificationType.PARTICIPANT_MUTED | NotificationType.PARTICIPANT_UNMUTED |
        NotificationType.PARTICIPANT_VIDEO_ON | NotificationType.PARTICIPANT_VIDEO_OFF |
        NotificationType.PARTICIPANT_SCREEN_SHARE | NotificationType.PARTICIPANT_SCREEN_STOP;
  data: {
    roomId: string;
    userId: number;
    timestamp: number;
  };
}

export interface ChannelNotification extends BaseNotification {
  type: NotificationType.CHANNEL_CREATE | NotificationType.CHANNEL_UPDATE | NotificationType.CHANNEL_DELETE;
  data: {
    channelId: number;
    serverId: number;
    name: string;
    type: 'text' | 'voice';
  };
}

export interface ServerNotification extends BaseNotification {
  type: NotificationType.SERVER_UPDATE | NotificationType.SERVER_DELETE;
  data: {
    serverId: number;
    name: string;
    icon?: string;
  };
}

export interface MemberNotification extends BaseNotification {
  type: NotificationType.MEMBER_JOIN | NotificationType.MEMBER_LEAVE;
  data: {
    serverId: number;
    userId: number;
    roles: string[];
  };
}

export interface RoleNotification extends BaseNotification {
  type: NotificationType.ROLE_UPDATE;
  data: {
    serverId: number;
    roleId: string;
    name: string;
    permissions: string[];
    color: string;
  };
}

export interface UserNotification extends BaseNotification {
  type: NotificationType.USER_ONLINE | NotificationType.USER_OFFLINE |
        NotificationType.USER_STATUS_UPDATE | NotificationType.USER_SETTINGS_UPDATE |
        NotificationType.USER_AVATAR_UPDATE;
  data: {
    userId: number;
    status?: 'online' | 'offline' | 'idle' | 'dnd';
    avatar?: string;
    settings?: Record<string, any>;
  };
}

export interface SystemNotification extends BaseNotification {
  type: NotificationType.SYSTEM_MAINTENANCE | NotificationType.SYSTEM_ERROR | NotificationType.SYSTEM_UPDATE;
  data: {
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
    action?: {
      type: string;
      payload: any;
    };
  };
}

export type Notification = 
  | MessageNotification
  | CallNotification
  | ParticipantNotification
  | ChannelNotification
  | ServerNotification
  | MemberNotification
  | RoleNotification
  | UserNotification
  | SystemNotification; 