import { BACKEND_URL } from '../../services/backend';
import { ChatService, ChatMessage, Participant } from '../../services/chat.service';
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { ApiService, State, Group, Channel, AdminRequest } from '../../services/api.service';
@Component({ selector: 'app-dashboard', standalone: true, imports: [FormsModule, DatePipe], templateUrl: './dashboard.html', styleUrl: './dashboard.css' })
export class Dashboard implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private readonly chat = inject(ChatService);
  participants: Participant[] = []; chatNotice = ''; sending = false;
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  state: State | null = null;
  tab = 'groups'; selectedId = ''; busy = false; loading = true; error = ''; notice = '';
  search = ''; onlyMine = false;
  groupForm = { name: '', description: '', themeColour: '#4da6ff', ageLimit: 0 };
  roomForm = { name: '', description: '', themeColour: '#4da6ff', ageLimit: 0 };
  editingRoomId = '';
  profileForm = { firstName: '', lastName: '', email: '', dateOfBirth: '', themeColour: '', password: '' };
  userForm = { username: '', password: '', firstName: '', lastName: '', email: '', dateOfBirth: '' };
  reason = ''; targetId = ''; promoteId = ''; assignmentUserId = ''; assignmentRoomId = '';
  room: Channel | null = null; message = ''; chatMessages: ChatMessage[] = [];
  ngOnDestroy(): void { this.chat.disconnect(); }
  closeRoom(): void { this.chat.leave(); this.room = null; this.chatMessages = []; this.participants = []; }
  mediaUrl(value?: string): string { return value?.startsWith('/api/media/') ? BACKEND_URL + value : value || ''; }
  ngOnInit(): void { this.refresh(); }
  get superAdmin(): boolean { return !!this.state?.user.roles.includes('Super Admin'); }
  get selected(): Group | undefined { return this.state?.groups.find(g => g.id === this.selectedId); }
  get groups(): Group[] { return (this.state?.groups || []).filter(g => (!this.onlyMine || g.member) && (g.name + ' ' + g.description).toLowerCase().includes(this.search.toLowerCase())); }
  get channels(): Channel[] { return (this.state?.channels || []).filter(c => c.groupId === this.selectedId); }
  get members() { return (this.state?.users || []).filter(u => this.selected?.memberIds.includes(u.id)); }
  get moderationTargets() { return (this.state?.users || []).filter(u => u.id !== this.state?.user.id && (this.selected?.memberIds.includes(u.id) || this.selected?.bannedUserIds.includes(u.id))); }
  get pendingCount(): number { return (this.state?.requests || []).filter(r => r.status === 'pending').length; }
  refresh(): void {
    this.loading = true;
    this.api.state().subscribe({ next: data => {
      this.state = data; this.auth.currentUser.set(data.user); this.loading = false;
      this.profileForm = { firstName: data.user.firstName || '', lastName: data.user.lastName || '', email: data.user.email || '', dateOfBirth: data.user.dateOfBirth || '', themeColour: data.user.themeColour || '', password: '' };
      if (this.selectedId && !data.groups.some(g => g.id === this.selectedId)) { this.selectedId = ''; this.room = null; }
    }, error: e => { this.loading = false; this.handleError(e); } });
  }
  handleError(e: HttpErrorResponse): void { this.busy = false; this.error = e.status === 0 ? 'Cannot reach the backend. Start the server and try again.' : e.error?.message || 'The action could not be completed.'; if (e.status === 401) { this.auth.currentUser.set(null); void this.router.navigate(['/login']); } }
  action(method: string, path: string, body: unknown, message: string, after?: () => void): void {
    if (this.busy) return; this.busy = true; this.error = ''; this.notice = '';
    this.api.send(method, path, body).subscribe({ next: () => { this.busy = false; this.notice = message; after?.(); this.refresh(); }, error: e => this.handleError(e) });
  }
  select(group: Group): void { this.closeRoom(); this.selectedId = group.id; this.groupForm = { name: group.name, description: group.description, themeColour: group.themeColour, ageLimit: group.ageLimit }; this.resetRoom(); this.reason = ''; this.targetId = ''; }
  username(id: string | null): string { return this.state?.users.find(u => u.id === id)?.username || 'Deleted user'; }
  label(type: string): string { return ({ groupCreation: 'Create group', groupJoin: 'Join group', channelCreation: 'Create room', banUser: 'Ban member', groupDeletion: 'Delete group', accountDeletion: 'Delete account' } as Record<string, string>)[type] || type; }
  canReview(r: AdminRequest): boolean {
    if (r.status !== 'pending') return false;
    if (this.superAdmin) return ['groupCreation', 'groupDeletion', 'accountDeletion'].includes(r.type);
    return ['groupJoin', 'channelCreation', 'banUser'].includes(r.type) && !!this.state?.groups.some(g => g.id === r.groupId && g.admin);
  }
  decide(r: AdminRequest, decision: string): void {
    if (decision === 'approve' && ['groupDeletion', 'accountDeletion', 'banUser'].includes(r.type) && !confirm(`Approve ${this.label(r.type).toLowerCase()} for ${r.type === 'groupDeletion' ? r.groupName : this.username(r.targetId)}?`)) return;
    this.action('POST', `/requests/${r.id}/${decision}`, {}, `Request ${decision === 'approve' ? 'approved' : 'rejected'}.`);
  }
  createGroupRequest(): void { this.action('POST', '/requests', { type: 'groupCreation', ...this.groupForm }, 'Group request sent to the Super Admin.', () => { this.tab = 'requests'; this.groupForm = { name: '', description: '', themeColour: '#4da6ff', ageLimit: 0 }; }); }
  join(group: Group): void { this.action('POST', '/requests', { type: 'groupJoin', groupId: group.id }, 'Join request sent to the group administrators.'); }
  saveGroup(): void { this.action('PATCH', `/groups/${this.selectedId}`, this.groupForm, 'Group details saved.'); }
  submitRequest(type: string): void {
    if (type === 'groupDeletion' && !confirm(`Request deletion of ${this.selected?.name}?`)) return;
    this.action('POST', '/requests', { type, groupId: this.selectedId, targetId: this.targetId, reason: this.reason, ...(type === 'channelCreation' ? this.roomForm : {}) }, 'Request submitted.', () => { this.reason = ''; this.tab = 'requests'; });
  }
  saveRoom(): void {
    this.action(this.editingRoomId ? 'PATCH' : 'POST', this.editingRoomId ? `/channels/${this.editingRoomId}` : `/groups/${this.selectedId}/channels`, this.roomForm, 'Room saved.', () => this.resetRoom());
  }
  editRoom(c: Channel): void { this.editingRoomId = c.id; this.roomForm = { name: c.name, description: c.description, themeColour: c.themeColour, ageLimit: c.ageLimit }; }
  resetRoom(): void { this.editingRoomId = ''; this.roomForm = { name: '', description: '', themeColour: '#4da6ff', ageLimit: 0 }; }
  deleteRoom(c: Channel): void { if (confirm(`Delete room ${c.name}?`)) this.action('DELETE', `/channels/${c.id}`, {}, 'Room deleted.', () => { if (this.room?.id === c.id) this.room = null; }); }
  promote(): void { this.action('POST', `/groups/${this.selectedId}/admins`, { userId: this.promoteId }, 'Administrator appointed.'); }
  stepDown(): void { if (confirm('Step down as administrator of this group?')) this.action('DELETE', `/groups/${this.selectedId}/admins/me`, {}, 'Administrator role removed.'); }
  removeMember(id: string): void { if (confirm(`Remove ${this.username(id)} from this group?`)) this.action('DELETE', `/groups/${this.selectedId}/members/${id}`, {}, 'Membership removed.'); }
  leaveGroup(): void { this.removeMember(this.state!.user.id); }
  assignRoom(): void { this.action('POST', `/channels/${this.assignmentRoomId}/members`, { userId: this.assignmentUserId }, 'Room assignment saved.'); }
  saveProfile(): void { this.action('PATCH', '/profile', this.profileForm, 'Profile saved.'); }
  createUser(): void { this.action('POST', '/users', this.userForm, 'User created.', () => { this.userForm = { username: '', password: '', firstName: '', lastName: '', email: '', dateOfBirth: '' }; }); }
  avatar(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type) || file.size > 2097152) { this.error = 'Choose a PNG, JPEG or GIF up to 2 MB.'; return; }
    const reader = new FileReader(); reader.onload = () => this.action('POST', '/profile/avatar', { data: reader.result }, 'Profile image saved.'); reader.readAsDataURL(file);
  }
  deleteAccount(): void {
    if (!confirm('Permanently delete your account? This cannot be undone.')) return;
    this.api.send('DELETE', '/profile').subscribe({ next: () => { this.chat.disconnect(); this.auth.currentUser.set(null); void this.router.navigate(['/login']); }, error: e => this.handleError(e) });
  }
  signOut(): void { this.chat.disconnect(); this.auth.logout().subscribe({ next: () => void this.router.navigate(['/login']), error: e => this.handleError(e) }); }
  async openRoom(c: Channel): Promise<void> {
    if (this.room?.id === c.id) return;
    this.error = '';
    this.chat.connect(m => { if (this.room) this.chatMessages = [...this.chatMessages, { ...m, mine: m.authorId === this.state?.user.id }]; }, p => this.participants = p, s => this.chatNotice = s, s => { this.room = null; this.chatMessages = []; this.participants = []; this.error = s; }, () => this.refresh(), id => this.chatMessages = this.chatMessages.filter(m => m.id !== id), ids => this.chatMessages = this.chatMessages.filter(m => ids.includes(m.authorId)));
    try {
      const response = await this.chat.request('room:join', { channelId: c.id });
      this.room = c; this.message = ''; this.chatNotice = '';
      this.chatMessages = response.messages.map((m: ChatMessage) => ({ ...m, mine: m.authorId === this.state?.user.id }));
      this.participants = response.participants;
    } catch (e) { this.error = (e as Error).message; }
  }
  async sendMessage(image?: string): Promise<void> {
    if (this.sending || (!this.message.trim() && !image)) return;
    this.sending = true; this.error = '';
    try { await this.chat.request('message:send', { text: this.message.trim(), image }); this.message = ''; }
    catch (e) { this.error = (e as Error).message; }
    finally { this.sending = false; }
  }
  async deleteMessage(id: string): Promise<void> {
    if (!confirm('Delete this message for everyone in the room?')) return;
    try { await this.chat.request('message:delete', { id }); } catch (e) { this.error = (e as Error).message; }
  }
  previewImage(event: Event): void {
    const input = event.target as HTMLInputElement, file = input.files?.[0]; if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type) || file.size > 2097152) { this.error = 'Choose a PNG, JPEG or GIF up to 2 MB.'; input.value = ''; return; }
    const reader = new FileReader(); reader.onload = () => { void this.sendMessage(reader.result as string); input.value = ''; }; reader.readAsDataURL(file);
  }
}

