# Сервис уведомлений

Сервис уведомлений обеспечивает доставку уведомлений пользователям через WebSocket и HTTP API, с поддержкой push-уведомлений для офлайн пользователей.

## Протоколы

### HTTP API (REST)

Базовый URL: `/api/v1/notifications`

#### Эндпоинты

1. `GET /` - Получение уведомлений пользователя
   - Query параметры:
     - `lastId`: ID последнего полученного уведомления (для пагинации)
   - Требует авторизацию
   - Возвращает массив уведомлений

2. `DELETE /` - Удаление уведомлений
   - Body: `{ notificationIds: string[] }`
   - Требует авторизацию

3. `POST /read` - Отметить уведомления как прочитанные
   - Body: `{ notificationIds: string[] }`
   - Требует авторизацию

4. `GET /unread/count` - Получение количества непрочитанных уведомлений
   - Требует авторизацию
   - Возвращает счетчики по категориям

### WebSocket

#### События

1. Клиент -> Сервер:
   - `authenticate` - Аутентификация WebSocket соединения
     - Payload: `userId: string`
   - `disconnect` - Отключение (автоматическое событие)

2. Сервер -> Клиент:
   - `notification` - Получение нового уведомления
     - Payload: объект Notification

## Типы уведомлений

1. `NEW_MESSAGE` - Новое сообщение
2. `CALL_STARTED` - Входящий звонок
3. `CALL_ENDED` - Звонок завершен
4. `CHANNEL_CREATED` - Создан новый канал
5. `FRIEND_REQUEST` - Запрос в друзья

## Структура данных

### Notification
```typescript
interface Notification {
  id: string;
  type: NotificationType;
  userId: string;
  createdAt: Date;
  isRead: boolean;
  data: NotificationData;
}
```

### NotificationData
В зависимости от типа уведомления:

1. MessageNotificationData
```typescript
interface MessageNotificationData {
  messageId: string;
  senderId: string;
  content: string;
  channelId?: string;
  serverId?: string;
  recipientId: string;
}
```

2. CallNotificationData
```typescript
interface CallNotificationData {
  callId: string;
  callerId: string;
  channelId?: string;
  serverId?: string;
  recipientId: string;
  action: 'started' | 'ended';
}
```

3. ChannelNotificationData
```typescript
interface ChannelNotificationData {
  channelId: string;
  serverId: string;
  channelName: string;
  userId: string;
}
```

4. FriendRequestNotificationData
```typescript
interface FriendRequestNotificationData {
  requestId: string;
  senderId: string;
  senderUsername: string;
  recipientId: string;
}
```

## Механизм работы

1. При подключении клиента через WebSocket:
   - Клиент отправляет событие `authenticate` с userId
   - Сервер добавляет сокет в комнату пользователя
   - Сохраняет информацию о подключении

2. При получении уведомления:
   - Если пользователь онлайн (есть активное WebSocket соединение):
     - Отправляет уведомление через WebSocket
   - Если пользователь оффлайн:
     - Отправляет push-уведомление
   - В обоих случаях сохраняет уведомление в Redis

3. При отключении клиента:
   - Удаляет информацию о соединении
   - Если это было последнее соединение пользователя, помечает его как оффлайн

## Метрики

Сервис предоставляет следующие метрики Prometheus:

1. WebSocket:
   - `ws_operations_total` - Количество WebSocket операций
   - `ws_operation_duration_seconds` - Длительность WebSocket операций

2. Redis:
   - `redis_operations_total` - Количество Redis операций
   - `redis_operation_duration_seconds` - Длительность Redis операций

3. Kafka:
   - `kafka_operations_total` - Количество Kafka операций
   - `kafka_operation_duration_seconds` - Длительность Kafka операций

## Конфигурация

Основные параметры конфигурации (через переменные окружения):

```env
PORT=3002
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
KAFKA_BROKERS=localhost:9092
KAFKA_SSL=false
PUSH_NOTIFICATIONS_ENABLED=true
WEB_PUSH_PUBLIC_KEY=
WEB_PUSH_PRIVATE_KEY=
WEB_PUSH_SUBJECT=
```

## Установка

1. Клонируйте репозиторий
2. Установите зависимости:
```bash
npm install
```
3. Создайте файл `.env` на основе `.env.example`
4. Запустите сервис:
```bash
# Разработка
npm run dev

# Продакшн
npm run build
npm start
```

## Конфигурация

### Переменные окружения

- `PORT` - порт сервера (по умолчанию 3002)
- `NODE_ENV` - окружение (development/production)
- `CORS_ORIGIN` - разрешенные источники для CORS

#### Redis
- `REDIS_HOST` - хост Redis
- `REDIS_PORT` - порт Redis
- `REDIS_PASSWORD` - пароль Redis
- `REDIS_DB` - номер базы данных Redis

#### Kafka
- `KAFKA_BROKERS` - список брокеров Kafka
- `KAFKA_SSL` - использование SSL
- `KAFKA_SASL` - использование SASL
- `KAFKA_USERNAME` - имя пользователя Kafka
- `KAFKA_PASSWORD` - пароль Kafka

#### JWT
- `JWT_SECRET` - секретный ключ для JWT

## API

### WebSocket события

#### Клиент -> Сервер
- `subscribe` - подписка на канал
- `unsubscribe` - отписка от канала

#### Сервер -> Клиент
- `notification` - получение уведомления

### HTTP эндпоинты

- `GET /health` - проверка здоровья сервиса
- `GET /metrics` - метрики Prometheus
- `GET /api/v1/notifications` - получение истории уведомлений

## Тестирование

```bash
# Unit тесты
npm test

# Тесты с watch режимом
npm run test:watch

# Тесты с покрытием
npm run test:coverage
```

## Линтинг

```bash
npm run lint
``` 