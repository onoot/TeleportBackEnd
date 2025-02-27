export enum NotificationType {
  NEW_MESSAGE = 'NEW_MESSAGE',
  CALL_STARTED = 'CALL_STARTED',
  CALL_ENDED = 'CALL_ENDED',
  CHANNEL_CREATED = 'CHANNEL_CREATED',
  FRIEND_REQUEST = 'FRIEND_REQUEST'
}

export interface BaseNotification {
  id: string;
  type: NotificationType;
  userId: string;
  createdAt: Date;
  isRead: boolean;
}

export interface MessageNotification extends BaseNotification {
  type: NotificationType.NEW_MESSAGE;
  data: {
    messageId: string;
    senderId: string;
    recipientId: string;
    content: string;
    channelId?: string;
    serverId?: string;
  };
}

export interface CallNotification extends BaseNotification {
  type: NotificationType.CALL_STARTED | NotificationType.CALL_ENDED;
  data: {
    callId: string;
    callerId: string;
    recipientId: string;
    action: 'started' | 'ended';
    channelId?: string;
    serverId?: string;
  };
}

export interface ChannelNotification extends BaseNotification {
  type: NotificationType.CHANNEL_CREATED;
  data: {
    channelName: string;
    userId: string;
    channelId: string;
    serverId: string;
  };
}

export interface FriendRequestNotification extends BaseNotification {
  type: NotificationType.FRIEND_REQUEST;
  data: {
    requestId: string;
    senderId: string;
    senderUsername: string;
    recipientId: string;
  };
}

export type Notification = 
  | MessageNotification 
  | CallNotification 
  | ChannelNotification 
  | FriendRequestNotification;

export interface KafkaNotificationMessage {
  key: string; // userId или serverId
  value: {
    notification: Notification;
    recipients: string[]; // Список ID пользователей для отправки push-уведомлений
  };
} 