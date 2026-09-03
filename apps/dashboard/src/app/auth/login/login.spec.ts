import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let mockAuthService: {
    login: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
  };
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockAuthService = {
      login: vi.fn().mockReturnValue(
        of({
          access_token: 'token',
          user: { id: '1', email: 'test@test.com' },
        }),
      ),
      register: vi.fn().mockReturnValue(
        of({
          access_token: 'token',
          user: { id: '1', email: 'test@test.com' },
        }),
      ),
    };
    mockRouter = { navigate: vi.fn() };

    component = Object.create(LoginComponent.prototype);
    component.email = signal('test@test.com');
    component.password = signal('password');
    component.error = signal('');
    component.loading = signal(false);
    component.activeTab = signal(0);
    Object.assign(component, {
      authService: mockAuthService,
      router: mockRouter,
    });
  });

  describe('submit', () => {
    it('should call login when activeTab is 0', () => {
      component.submit();
      expect(mockAuthService.login).toHaveBeenCalledWith(
        'test@test.com',
        'password',
      );
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/synthesis']);
    });

    it('should call register when activeTab is 1', () => {
      component.activeTab.set(1);
      component.submit();
      expect(mockAuthService.register).toHaveBeenCalledWith(
        'test@test.com',
        'password',
      );
    });

    it('should set error on failure', () => {
      mockAuthService.login.mockReturnValue(
        throwError(() => ({ error: { message: 'Invalid credentials' } })),
      );
      component.submit();
      expect(component.error()).toBe('Invalid credentials');
      expect(component.loading()).toBe(false);
    });
  });
});
