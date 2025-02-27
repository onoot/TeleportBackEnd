import { NotificationType } from './events';

export interface NotificationClient {
  // Подключение к сервису
  connect(token: string): void;
  
  // Подписка на определенный сервис
  subscribe(serviceType: 'messages' | 'calls' | 'channels' | 'users'): Promise<void>;
  
  // Отписка от сервиса
  unsubscribe(serviceType: 'messages' | 'calls' | 'channels' | 'users'): Promise<void>;
  
  // Обработчики событий
  on(event: NotificationType, callback: (data: any) => void): void;
  off(event: NotificationType, callback: (data: any) => void): void;
  
  // Отключение
  disconnect(): void;
}

// Пример использования на клиенте:
/*
const notificationClient = new NotificationClient('ws://api.messenger.local/ws');

// Подключение
notificationClient.connect('jwt_token');

// Подписка на сервисы
await notificationClient.subscribe('messages');
await notificationClient.subscribe('calls');

// Обработка уведомлений
notificationClient.on(NotificationType.MESSAGE_CREATED, (data) => {
  console.log('Новое сообщение:', data);
});

notificationClient.on(NotificationType.CALL_INITIATED, (data) => {
  console.log('Входящий звонок:', data);
});

// Отписка
await notificationClient.unsubscribe('calls');

// Отключение
notificationClient.disconnect();
*/ 