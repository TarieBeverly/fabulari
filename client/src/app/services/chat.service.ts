import { BACKEND_URL } from './backend';
import { Injectable, NgZone, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
export interface ChatMessage { id: string; authorId: string; author: string; authorAvatar?: string; text: string; time: string; image?: string; mine: boolean; }
export interface Participant { id: string; username: string; avatar: string; }
@Injectable({ providedIn: 'root' })
export class ChatService {
  private socket?: Socket;
  private zone = inject(NgZone);
  connect(onMessage: (m: ChatMessage) => void, onParticipants: (p: Participant[]) => void, onNotice: (s: string) => void, onClosed: (s: string) => void, onUpdate: () => void, onDelete: (id: string) => void, onAuthors: (ids: string[]) => void): void {
    if (this.socket) return;
    this.socket = io(BACKEND_URL, { withCredentials: true, autoConnect: false, reconnection: false });
    this.socket.on('message:new', m => this.zone.run(() => onMessage(m)));
    this.socket.on('message:deleted', d => this.zone.run(() => onDelete(d.id)));
    this.socket.on('messages:authors', d => this.zone.run(() => onAuthors(d.ids)));
    this.socket.on('room:participants', p => this.zone.run(() => onParticipants(p)));
    this.socket.on('room:notice', s => this.zone.run(() => onNotice(s)));
    this.socket.on('room:closed', d => this.zone.run(() => onClosed(d.message)));
    this.socket.on('workspace:updated', () => this.zone.run(onUpdate));
    this.socket.on('disconnect', () => this.zone.run(() => onClosed('Chat disconnected. Open the room again to reconnect.')));
    this.socket.on('connect_error', () => this.zone.run(() => onClosed('Cannot connect to chat. Check the backend and sign in again.')));
    this.socket.connect();
  }
  request(event: string, data: unknown): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket) { reject(new Error('Chat is not connected.')); return; }
      if (!this.socket.connected) this.socket.connect();
      this.socket.timeout(15000).emit(event, data, (error: Error | null, response: any) => this.zone.run(() => {
        if (error || !response?.ok) reject(new Error(response?.message || 'Chat timed out. Please try again.')); else resolve(response);
      }));
    });
  }
  leave(): void { if (this.socket?.connected) this.socket.emit('room:leave', {}); }
  disconnect(): void { this.socket?.disconnect(); this.socket = undefined; }
}
