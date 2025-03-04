import { Request, Response } from 'express';
import { Channel } from '../entities/Channel';
import { getRepository } from 'typeorm';
import { Permission } from '../types/role';

export class ChannelController {
  static async createChannel(req: Request, res: Response) {
    try {
      const { name, type, categoryId } = req.body;
      const channelRepository = getRepository(Channel);

      const channel = channelRepository.create({
        name,
        type,
        category_id: parseInt(categoryId)
      });

      await channelRepository.save(channel);
      return res.status(201).json(channel);
    } catch (error) {
      console.error('Error creating channel:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getCategoryChannels(req: Request, res: Response) {
    try {
      const { categoryId } = req.params;
      const channelRepository = getRepository(Channel);

      const channels = await channelRepository.find({
        where: { category_id: parseInt(categoryId) }
      });

      return res.json(channels);
    } catch (error) {
      console.error('Error getting category channels:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async updateChannel(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, type } = req.body;
      const channelRepository = getRepository(Channel);

      const channel = await channelRepository.findOne({
        where: { id: parseInt(id) }
      });
      
      if (!channel) {
        return res.status(404).json({ message: 'Channel not found' });
      }

      channel.name = name;
      channel.type = type;

      await channelRepository.save(channel);
      return res.json(channel);
    } catch (error) {
      console.error('Error updating channel:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async deleteChannel(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const channelRepository = getRepository(Channel);

      const channel = await channelRepository.findOne({
        where: { id: parseInt(id) }
      });
      
      if (!channel) {
        return res.status(404).json({ message: 'Channel not found' });
      }

      await channelRepository.remove(channel);
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting channel:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
} 