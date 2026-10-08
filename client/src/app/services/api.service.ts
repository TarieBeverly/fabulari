import { BACKEND_URL } from './backend';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
export interface Profile { id: string; username: string; roles: string[]; firstName: string; lastName: string; email: string; dateOfBirth: string; themeColour: string; avatar: string; }
export interface Group { id: string; name: string; description: string; themeColour: string; ageLimit: number; memberIds: string[]; adminIds: string[]; bannedUserIds: string[]; member: boolean; admin: boolean; banned: boolean; }
export interface Channel { id: string; groupId: string; name: string; description: string; themeColour: string; ageLimit: number; memberIds: string[]; }
export interface AdminRequest { id: string; type: string; requesterId: string; requesterName: string; groupId: string | null; groupName: string; targetId: string | null; payload: { name?: string; description?: string; ageLimit?: number }; reason: string; status: string; createdAt: string; }
export interface AuditLog { id: string; actorName: string; action: string; targetId: string; groupId: string | null; createdAt: string; }
export interface State { user: Profile; groups: Group[]; channels: Channel[]; users: Profile[]; requests: AdminRequest[]; logs: AuditLog[]; }
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = BACKEND_URL + '/api';
  state() { return this.http.get<State>(this.base + '/state', { withCredentials: true }); }
  send(method: string, path: string, body: unknown = {}) { return this.http.request<{ message?: string }>(method, this.base + path, { body, withCredentials: true }); }
}
