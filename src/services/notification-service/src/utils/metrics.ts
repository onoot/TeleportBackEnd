import { Registry, Counter, Histogram } from 'prom-client';

const registry = new Registry();

// WebSocket метрики
export const wsOperationDuration = new Histogram({
  name: 'ws_operation_duration_seconds',
  help: 'Duration of WebSocket operations',
  labelNames: ['type', 'status'],
  registers: [registry]
});

export const wsOperations = new Counter({
  name: 'ws_operations_total',
  help: 'Total number of WebSocket operations',
  labelNames: ['type', 'status'],
  registers: [registry]
});

// Kafka метрики
export const kafkaOperations = new Counter({
  name: 'kafka_operations_total',
  help: 'Total number of Kafka operations',
  labelNames: ['type', 'status'],
  registers: [registry]
});

export const kafkaOperationDuration = new Histogram({
  name: 'kafka_operation_duration_seconds',
  help: 'Duration of Kafka operations',
  labelNames: ['type', 'status'],
  registers: [registry]
});

// Redis метрики
export const redisOperations = new Counter({
  name: 'redis_operations_total',
  help: 'Total number of Redis operations',
  labelNames: ['type', 'status'],
  registers: [registry]
});

export const redisOperationDuration = new Histogram({
  name: 'redis_operation_duration_seconds',
  help: 'Duration of Redis operations',
  labelNames: ['type', 'status'],
  registers: [registry]
});

export const metrics = {
  wsOperationDuration,
  wsOperations,
  kafkaOperations,
  kafkaOperationDuration,
  redisOperations,
  redisOperationDuration
};

// Регистрируем все метрики
Object.values(metrics).forEach(metric => {
  if (metric instanceof Registry) {
    metric.registerMetric(metric);
  }
}); 