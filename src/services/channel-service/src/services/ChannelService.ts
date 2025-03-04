import { getRepository } from 'typeorm';
import { Channel } from '../entities/Channel';

export class ChannelService {
  private channelRepository = getRepository(Channel);

  async findById(id: string): Promise<Channel | null> {
    return this.channelRepository.findOne({
      where: { id: parseInt(id) }
    });
  }

  async update(id: string, data: Partial<Channel>): Promise<Channel> {
    await this.channelRepository.update(parseInt(id), data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Channel not found after update');
    }
    return updated;
  }
} 