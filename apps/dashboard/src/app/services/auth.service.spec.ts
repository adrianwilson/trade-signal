import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { signal, computed } from '@angular/core';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let mockHttp: { post: ReturnType<typeof vi.fn> };
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };

  const mockResponse = {
    access_token: 'jwt-token',
    user: { id: '1', email: 'test@test.com' },
  };

  beforeEach(() => {
    localStorage.clear();
    mockHttp = { post: vi.fn().mockReturnValue(of(mockResponse)) };
    mockRouter = { navigate: vi.fn() };

    service = Object.create(AuthService.prototype);
    Object.assign(service, {
      http: mockHttp,
      router: mockRouter,
      baseUrl: 'http://localhost:3000/api/auth',
      _token: signal<string | null>(null),
      _user: signal<{ id: string; email: string } | null>(null),
    });
    // Recreate computed properties
    Object.defineProperty(service, 'isAuthenticated', {
      value: computed(() => !!(service as any)._token()),
    });
    Object.defineProperty(service, 'user', {
      value: (service as any)._user.asReadonly(),
    });
    Object.defineProperty(service, 'token', {
      value: (service as any)._token.asReadonly(),
    });
  });

  describe('login', () => {
    it('should call login endpoint and store token', () => {
      service.login('test@test.com', 'pass').subscribe();
      expect(mockHttp.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/login',
        { email: 'test@test.com', password: 'pass' },
      );
      expect(localStorage.getItem('auth_token')).toBe('jwt-token');
    });
  });

  describe('register', () => {
    it('should call register endpoint and store token', () => {
      service.register('test@test.com', 'pass').subscribe();
      expect(mockHttp.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/register',
        { email: 'test@test.com', password: 'pass' },
      );
      expect(localStorage.getItem('auth_token')).toBe('jwt-token');
    });
  });

  describe('logout', () => {
    it('should clear token and navigate to login', () => {
      localStorage.setItem('auth_token', 'token');
      service.logout();
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });
  });
});
