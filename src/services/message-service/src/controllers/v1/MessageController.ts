import { Request, Response, NextFunction } from 'express';
import { Service } from 'typedi';
import { MessageService } from '../../services/MessageService';
import { ChannelService } from '../../services/ChannelService';
import { IMessage, SendMessageRequest, EditMessageRequest, AddReactionRequest, MessageType, MessageStatus } from '../../models/MessageModel';
import { JsonController, Post, Get, Body, Param, UseBefore, CurrentUser, HttpError, QueryParam, UploadedFile, Authorized, Delete } from 'routing-controllers';
import { authMiddleware } from '../../middleware/auth';
import { R2Service } from '../../services/R2Service';

@JsonController('/api/v1/messages')
@Service()
export class MessageController {
  private r2Service: R2Service;
  private channelService: ChannelService;

  constructor(
    private messageService: MessageService,
    channelService: ChannelService
  ) {
    this.r2Service = R2Service.getInstance();
    this.channelService = channelService;
  }

  @Get('/dialog/:userId')
  @UseBefore(authMiddleware)
  async getDialogMessages(
    @Param('userId') partnerId: string,
    @QueryParam('page') page: number = 1,
    @QueryParam('limit') limit: number = 50,
    @CurrentUser() currentUser: { id: string }
  ) {
    return this.messageService.getDialogMessages(currentUser.id, partnerId, page, limit);
  }

  @Post('/dialog/:userId')
  @UseBefore(authMiddleware)
  async sendDirectMessage(
    @Param('userId') recipientId: string,
    @Body() messageData: SendMessageRequest,
    @CurrentUser() currentUser: { id: string }
  ) {
    return this.messageService.sendDirectMessage(currentUser.id, recipientId, messageData);
  }

  @Get('/channel/:channelId')
  @UseBefore(authMiddleware)
  async getChannelMessages(
    @Param('channelId') channelId: string,
    @QueryParam('page') page: number = 1,
    @QueryParam('limit') limit: number = 50,
    @CurrentUser() currentUser: { id: string }
  ) {
    return this.messageService.getChannelMessages(channelId, page, limit);
  }

  @Post('/channel/:channelId')
  @UseBefore(authMiddleware)
  async sendChannelMessage(
    @Param('channelId') channelId: string,
    @Body() messageData: SendMessageRequest,
    @CurrentUser() currentUser: { id: string }
  ) {
    const channel = await this.channelService.findById(channelId);
    if (!channel) {
      throw new HttpError(404, 'Channel not found');
    }

    return this.messageService.sendChannelMessage(currentUser.id, channelId, channel.serverId || '', messageData);
  }

  @Get('/unread')
  @UseBefore(authMiddleware)
  async getUnreadMessages(@CurrentUser() currentUser: { id: string }) {
    return this.messageService.getUnreadMessages(currentUser.id);
  }

  @Post('/:messageId/read')
  @UseBefore(authMiddleware)
  async markAsRead(
    @Param('messageId') messageId: string,
    @CurrentUser() currentUser: { id: string }
  ) {
    await this.messageService.markAsRead(currentUser.id, messageId);
    return { success: true };
  }

  @Post('/dialog/:userId/read')
  @UseBefore(authMiddleware)
  async markDialogAsRead(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: { id: string }
  ) {
    await this.messageService.markDialogAsRead(currentUser.id, userId);
    return { success: true };
  }

  @Post('/:messageId/edit')
  @UseBefore(authMiddleware)
  async editMessage(
    @Param('messageId') messageId: string,
    @Body() messageData: EditMessageRequest,
    @CurrentUser() currentUser: { id: string }
  ) {
    return this.messageService.editMessage(messageId, messageData.content);
  }

  @Post('/:messageId/delete')
  @UseBefore(authMiddleware)
  async deleteMessage(
    @Param('messageId') messageId: string,
    @CurrentUser() currentUser: { id: string }
  ) {
    await this.messageService.deleteMessage(messageId);
    return { success: true };
  }

  @Post('/:messageId/reaction')
  @UseBefore(authMiddleware)
  async addReaction(
    @Param('messageId') messageId: string,
    @Body() reactionData: AddReactionRequest,
    @CurrentUser() currentUser: { id: string }
  ) {
    return this.messageService.addReaction(currentUser.id, messageId, reactionData);
  }

  @Delete('/:messageId/reaction/:emoji')
  @UseBefore(authMiddleware)
  async removeReaction(
    @Param('messageId') messageId: string,
    @Param('emoji') emoji: string,
    @CurrentUser() currentUser: { id: string }
  ) {
    return this.messageService.removeReaction(currentUser.id, messageId, emoji);
  }

  @Get('/:messageId/reactions')
  @UseBefore(authMiddleware)
  async getMessageReactions(@Param('messageId') messageId: string) {
    return this.messageService.getMessageReactions(messageId);
  }

  @Post('/channel/:channelId/attachment')
  @UseBefore(authMiddleware)
  async uploadAttachment(
    @Param('channelId') channelId: string,
    @UploadedFile('file', { required: true }) file: { buffer: Buffer; mimetype: string; originalname: string; size: number }
  ) {
    const url = await this.r2Service.uploadAttachment(file.buffer, file.mimetype);
    return { url };
  }
} 