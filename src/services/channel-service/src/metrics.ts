import { Registry, Counter, Gauge, Histogram } from 'prom-client';

// Создаем реестр метрик
export const register = new Registry();

// Метрики для серверов
export const activeServersGauge = new Gauge({
  name: 'active_servers_total',
  help: 'Total number of active servers',
  registers: [register]
});

export const serverMembersGauge = new Gauge({
  name: 'server_members_total',
  help: 'Total number of members in servers',
  labelNames: ['server_id'],
  registers: [register]
});

export const serverOperationDuration = new Histogram({
  name: 'server_operation_duration_seconds',
  help: 'Duration of server operations',
  labelNames: ['operation'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

export const serverErrorsCounter = new Counter({
  name: 'server_errors_total',
  help: 'Total number of errors in server operations',
  labelNames: ['operation', 'error_type'],
  registers: [register]
});

// Метрики для каналов
export const activeChannelsGauge = new Gauge({
  name: 'active_channels_total',
  help: 'Total number of active channels',
  labelNames: ['server_id'],
  registers: [register]
});

export const channelMembersGauge = new Gauge({
  name: 'channel_members_total',
  help: 'Total number of members in channels',
  labelNames: ['channel_id'],
  registers: [register]
});

export const channelMessagesCounter = new Counter({
  name: 'channel_messages_total',
  help: 'Total number of messages sent in channels',
  labelNames: ['channel_id'],
  registers: [register]
});

export const channelOperationDuration = new Histogram({
  name: 'channel_operation_duration_seconds',
  help: 'Duration of channel operations',
  labelNames: ['operation', 'server_id'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

export const channelErrorsCounter = new Counter({
  name: 'channel_errors_total',
  help: 'Total number of errors in channel operations',
  labelNames: ['operation', 'error_type', 'server_id'],
  registers: [register]
});

// Метрики для ролей
export const activeRolesGauge = new Gauge({
  name: 'active_roles_total',
  help: 'Total number of active roles',
  labelNames: ['server_id'],
  registers: [register]
});

export const roleOperationDuration = new Histogram({
  name: 'role_operation_duration_seconds',
  help: 'Duration of role operations',
  labelNames: ['operation', 'server_id'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

export const roleErrorsCounter = new Counter({
  name: 'role_errors_total',
  help: 'Total number of errors in role operations',
  labelNames: ['operation', 'error_type', 'server_id'],
  registers: [register]
});

// Метрики для Kafka
export const kafkaNotificationCounter = new Counter({
  name: 'kafka_notifications_total',
  help: 'Total number of notifications sent to Kafka',
  labelNames: ['type', 'status'],
  registers: [register]
});

export const kafkaOperationDuration = new Histogram({
  name: 'kafka_operation_duration_seconds',
  help: 'Duration of Kafka operations',
  labelNames: ['operation'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

// Метрики для групп
export const activeGroupsGauge = new Gauge({
  name: 'active_groups_total',
  help: 'Total number of active groups',
  registers: [register]
});

export const groupMembersGauge = new Gauge({
  name: 'group_members_total',
  help: 'Total number of members in groups',
  labelNames: ['group_id'],
  registers: [register]
});

export const groupMessagesCounter = new Counter({
  name: 'group_messages_total',
  help: 'Total number of messages sent in groups',
  labelNames: ['group_id'],
  registers: [register]
});

export const groupOperationDuration = new Histogram({
  name: 'group_operation_duration_seconds',
  help: 'Duration of group operations',
  labelNames: ['operation'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
}); 