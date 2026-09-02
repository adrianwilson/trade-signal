import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity';
import { hashSync, compareSync } from 'bcryptjs';
import { randomUUID } from 'crypto';

export interface AuthResult {
  access_token: string;
  user: { id: string; email: string };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, password: string): Promise<AuthResult> {
    const existing = await this.userRepository.findOneBy({ email });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const user: UserEntity = {
      id: randomUUID(),
      email,
      password: hashSync(password, 10),
      createdAt: new Date().toISOString(),
    };

    await this.userRepository.save(user);
    return this.createToken(user);
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.userRepository.findOneBy({ email });
    if (!user || !compareSync(password, user.password)) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.createToken(user);
  }

  async validateUser(userId: string): Promise<UserEntity | null> {
    return this.userRepository.findOneBy({ id: userId });
  }

  private createToken(user: UserEntity): AuthResult {
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email },
    };
  }
}
