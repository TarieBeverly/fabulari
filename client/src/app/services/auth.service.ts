import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

export interface User {
  id: string;
  username: string;
  roles: string[];
}

interface AuthResponse {
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/auth';

  readonly currentUser = signal<User | null>(null);

  login(username: string, password: string) {
    return this.http.post<AuthResponse>(
      `${this.apiUrl}/login`,
      { username, password },
      { withCredentials: true }
    ).pipe(
      tap((response) => this.currentUser.set(response.user))
    );
  }

  loadCurrentUser() {
    return this.http.get<AuthResponse>(
      `${this.apiUrl}/me`,
      { withCredentials: true }
    ).pipe(
      tap((response) => this.currentUser.set(response.user))
    );
  }

  logout() {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/logout`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(() => this.currentUser.set(null))
    );
  }
}