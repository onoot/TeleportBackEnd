import { Module } from '@nestjs/common';
import { CallService } from './services/CallService';
import { RedisService } from './services/RedisService';
import { KafkaService } from './services/KafkaService';
import { CallGateway } from './gateways/CallGateway';

@Module({
  providers: [
    CallService,
    RedisService,
    KafkaService,
    CallGateway
  ],
  exports: [
    CallService,
    RedisService,
    KafkaService,
    CallGateway
  ]
})
export class CallModule {} 