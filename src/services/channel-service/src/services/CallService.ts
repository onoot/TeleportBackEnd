import axios from 'axios';
import { config } from '../config';

class CallService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.callService.url;
  }

  async createRoom() {
    try {
      const response = await axios.post(`${this.baseUrl}/rooms`);
      return response.data;
    } catch (error) {
      console.error('Error creating room:', error);
      throw new Error('Failed to create room');
    }
  }

  async deleteRoom(roomId: string) {
    try {
      await axios.delete(`${this.baseUrl}/rooms/${roomId}`);
    } catch (error) {
      console.error('Error deleting room:', error);
      throw new Error('Failed to delete room');
    }
  }
}

export const callService = new CallService(); 