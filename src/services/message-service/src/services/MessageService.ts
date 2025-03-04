import { Service } from 'typedi';
import { MessageModel, IMessage, MessageStatus, MessageType, SendMessageRequest, EditMessageRequest, AddReactionRequest, Attachment } from '../models/MessageModel';
import { KafkaProducer } from '../kafka/producer';
import { Message } from '../entities/Message';
import { AppDataSource } from '../data-source';
import { Repository, DeepPartial } from 'typeorm';
import axios, { AxiosError } from 'axios';
import { config } from '../config';
import { ChannelService } from './ChannelService';

interface CreateMessageDTO {
  content: string;
  channelId: string;
  authorId: string;
  replyTo?: string;
  attachments?: string[];
}

@Service()
export class MessageService {
  private messageRepository: Repository<Message>;

  constructor(
    private kafkaProducer: KafkaProducer,
    private channelService: ChannelService
  ) {
    this.messageRepository = AppDataSource.getRepository(Message);
  }

  async getDialogMessages(currentUserId: string, partnerId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [messages, total] = await this.messageRepository.findAndCount({
      where: [
        { senderId: currentUserId, recipientId: partnerId, isDeleted: false },
        { senderId: partnerId, recipientId: currentUserId, isDeleted: false }
      ],
      order: { createdAt: 'DESC' },
      skip,
      take: limit
    });

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + messages.length < total
      }
    };
  }

  async getChannelMessages(channelId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [messages, total] = await this.messageRepository.findAndCount({
      where: {
        channelId,
        isDeleted: false
      },
      order: { createdAt: 'DESC' },
      skip,
      take: limit
    });

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + messages.length < total
      }
    };
  }

  async getUnreadMessages(userId: string) {
    return this.messageRepository.find({
      where: {
        recipientId: userId,
        status: MessageStatus.SENT,
        isDeleted: false
      },
      order: { createdAt: 'DESC' }
    });
  }

  async sendDirectMessage(senderId: string, recipientId: string, messageRequest: SendMessageRequest) {
    const messageData: DeepPartial<Message> = {
      type: MessageType.DIRECT,
      senderId,
      recipientId,
      content: messageRequest.content,
      attachments: messageRequest.attachments || [],
      status: MessageStatus.SENT,
      replyTo: messageRequest.replyToId || undefined
    };

    const message = this.messageRepository.create(messageData);
    const savedMessage = await this.messageRepository.save(message);

    await this.kafkaProducer.send('notifications', {
      type: 'new_direct_message',
      messageId: savedMessage.id,
      senderId,
      recipientId,
      content: savedMessage.content,
      replyTo: savedMessage.replyTo
    });

    return savedMessage;
  }

  async sendChannelMessage(senderId: string, channelId: string, serverId: string, messageRequest: SendMessageRequest) {
    const messageData: DeepPartial<Message> = {
      type: MessageType.CHANNEL,
      senderId,
      channelId,
      serverId,
      content: messageRequest.content,
      attachments: messageRequest.attachments || [],
      status: MessageStatus.SENT,
      replyTo: messageRequest.replyToId || undefined
    };

    const message = this.messageRepository.create(messageData);
    const savedMessage = await this.messageRepository.save(message);

    await this.kafkaProducer.send('notifications', {
      type: 'new_channel_message',
      messageId: savedMessage.id,
      senderId,
      channelId,
      serverId,
      content: savedMessage.content,
      replyTo: savedMessage.replyTo
    });

    return savedMessage;
  }

  async markAsRead(userId: string, messageId: string) {
    const result = await this.messageRepository.update(
      {
        id: messageId,
        recipientId: userId,
        status: MessageStatus.SENT
      },
      { status: MessageStatus.READ }
    );

    if (result.affected === 0) {
      throw new Error('Message not found or already read');
    }
  }

  async markDialogAsRead(userId: string, partnerId: string) {
    await this.messageRepository.update(
      {
        senderId: partnerId,
        recipientId: userId,
        status: MessageStatus.SENT
      },
      { status: MessageStatus.READ }
    );
  }

  async editMessage(messageId: string, content: string) {
    const message = await this.messageRepository.findOne({
      where: { id: messageId }
    });

    if (!message) {
      throw new Error('Message not found');
    }

    message.content = content;
    message.edited = true;
    message.editedAt = new Date();

    await this.messageRepository.save(message);
    return message;
  }

  async deleteMessage(messageId: string) {
    const result = await this.messageRepository.update(
      { id: messageId },
      { isDeleted: true }
    );

    if (result.affected === 0) {
      throw new Error('Message not found');
    }

    return true;
  }

  async addReaction(userId: string, messageId: string, reaction: AddReactionRequest) {
    const message = await this.messageRepository.findOne({
      where: { id: messageId }
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (!message.reactions) {
      message.reactions = {};
    }

    if (!message.reactions[reaction.emoji]) {
      message.reactions[reaction.emoji] = [];
    }

    if (!message.reactions[reaction.emoji].includes(userId)) {
      message.reactions[reaction.emoji].push(userId);
      await this.messageRepository.save(message);
    }

    return message;
  }

  async removeReaction(userId: string, messageId: string, emoji: string) {
    const message = await this.messageRepository.findOne({
      where: { id: messageId }
    });

    if (!message || !message.reactions || !message.reactions[emoji]) {
      throw new Error('Message or reaction not found');
    }

    message.reactions[emoji] = message.reactions[emoji].filter((id: string) => id !== userId);
    
    if (message.reactions[emoji].length === 0) {
      delete message.reactions[emoji];
    }

    await this.messageRepository.save(message);
    return message;
  }

  async getMessageReactions(messageId: string) {
    const message = await this.messageRepository.findOne({
      where: { id: messageId }
    });

    if (!message) {
      throw new Error('Message not found');
    }

    return message.reactions;
  }

  async checkAccess(userId: string, channelId: string): Promise<boolean> {
    return this.channelService.checkAccess(userId, channelId);
  }

  async getRecentMessages(channelId: string, limit: number = 50) {
    return this.messageRepository.find({
      where: { channelId, isDeleted: false },
      order: { createdAt: 'DESC' },
      take: limit
    });
  }

  async getChannelMembers(channelId: string): Promise<string[]> {
    return this.channelService.getMembers(channelId);
  }

  async createMessage(data: CreateMessageDTO): Promise<Message> {
    const messageData: DeepPartial<Message> = {
      type: MessageType.CHANNEL,
      content: data.content,
      channelId: data.channelId,
      senderId: data.authorId,
      replyTo: data.replyTo,
      attachments: data.attachments || []
    };

    const message = this.messageRepository.create(messageData);
    return this.messageRepository.save(message);
  }
} 