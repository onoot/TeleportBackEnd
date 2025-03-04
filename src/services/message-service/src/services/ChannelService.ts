import { Service } from 'typedi';
import axios, { AxiosError } from 'axios';
import { config } from '../../config';

interface Channel {
  id: string;
  name: string;
  type: string;
  serverId?: string;
  members: string[];
}

const CHANNEL_SERVICE_URL = process.env.CHANNEL_SERVICE_URL || 'http://localhost:3001';

@Service()
export class ChannelService {
  private readonly channelServiceUrl: string;

  constructor() {
    this.channelServiceUrl = process.env.CHANNEL_SERVICE_URL || 'http://channel-service:3000';
  }

  async findById(channelId: string): Promise<Channel | null> {
    try {
      const response = await axios.get<Channel>(`${this.channelServiceUrl}/api/v1/channels/${channelId}`);
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async checkAccess(userId: string, channelId: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `${CHANNEL_SERVICE_URL}/api/v1/channels/${channelId}/members/${userId}`
      );
      return response.status === 200;
    } catch (error) {
      if ((error as AxiosError).response?.status === 404) {
        return false;
      }
      throw error;
    }
  }

  async getMembers(channelId: string): Promise<string[]> {
    try {
      const response = await axios.get(
        `${CHANNEL_SERVICE_URL}/api/v1/channels/${channelId}/members`
      );
      return response.data.members;
    } catch (error) {
      if ((error as AxiosError).response?.status === 404) {
        return [];
      }
      throw error;
    }
  }
} 