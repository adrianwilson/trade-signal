import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { hashSync } from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepo: {
    findOneBy: jest.Mock;
    save: jest.Mock;
  };
  let mockJwtService: Partial<JwtService>;

  beforeEach(() => {
    mockUserRepo = {
      findOneBy: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((user) => Promise.resolve(user)),
    };
    mockJwtService = {
      sign: jest.fn().mockReturnValue('test-jwt-token'),
    };
    service = new AuthService(
      mockUserRepo as any,
      mockJwtService as JwtService,
    );
  });

  describe('register', () => {
    it('should create a new user and return token', async () => {
      const result = await service.register('test@example.com', 'password123');
      expect(result.access_token).toBe('test-jwt-token');
      expect(result.user.email).toBe('test@example.com');
      expect(mockUserRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if email exists', async () => {
      mockUserRepo.findOneBy.mockResolvedValue({ email: 'test@example.com' });
      await expect(
        service.register('test@example.com', 'password123'),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash the password', async () => {
      await service.register('test@example.com', 'password123');
      const savedUser = mockUserRepo.save.mock.calls[0][0];
      expect(savedUser.password).not.toBe('password123');
      expect(savedUser.password).toMatch(/^\$2[aby]\$/);
    });
  });

  describe('login', () => {
    it('should return token for valid credentials', async () => {
      mockUserRepo.findOneBy.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password: hashSync('password123', 10),
      });
      const result = await service.login('test@example.com', 'password123');
      expect(result.access_token).toBe('test-jwt-token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockUserRepo.findOneBy.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password: hashSync('password123', 10),
      });
      await expect(service.login('test@example.com', 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      await expect(
        service.login('nobody@example.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    it('should return user if found', async () => {
      const user = { id: 'user-1', email: 'test@example.com' };
      mockUserRepo.findOneBy.mockResolvedValue(user);
      const result = await service.validateUser('user-1');
      expect(result).toEqual(user);
    });

    it('should return null if not found', async () => {
      const result = await service.validateUser('nonexistent');
      expect(result).toBeNull();
    });
  });
});
