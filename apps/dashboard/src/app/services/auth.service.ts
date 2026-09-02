import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

interface AuthResponse {
  access_token: string;
  user: { id: string; email: string };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = 'http://localhost:3000/api/auth';

  private readonly _token = signal<string | null>(
    localStorage.getItem('auth_token'),
  );
  private readonly _user = signal<{ id: string; email: string } | null>(
    JSON.parse(localStorage.getItem('auth_user') ?? 'null'),
  );

  readonly isAuthenticated = computed(() => !!this._token());
  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();

  register(email: string, password: string) {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/register`, { email, password })
      .pipe(tap((res) => this.setSession(res)));
  }

  login(email: string, password: string) {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/login`, { email, password })
      .pipe(tap((res) => this.setSession(res)));
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this._token.set(null);
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  private setSession(res: AuthResponse): void {
    localStorage.setItem('auth_token', res.access_token);
    localStorage.setItem('auth_user', JSON.stringify(res.user));
    this._token.set(res.access_token);
    this._user.set(res.user);
  }
}
