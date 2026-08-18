import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { findByEmail: jest.Mock; findById: jest.Mock };
  let jwtService: { sign: jest.Mock };

  const passwordHash = bcrypt.hashSync('correct-password', 10);
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash,
    fullname: 'Test User',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    usersService = { findByEmail: jest.fn(), findById: jest.fn() };
    jwtService = { sign: jest.fn().mockReturnValue('signed-jwt-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('returns an access token for valid credentials', async () => {
    usersService.findByEmail.mockResolvedValue(mockUser as any);

    const result = await service.login({ email: 'test@example.com', password: 'correct-password' });

    expect(result.accessToken).toBe('signed-jwt-token');
    expect(result.user.email).toBe('test@example.com');
  });

  it('throws UnauthorizedException for unknown email', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({ email: 'unknown@example.com', password: 'whatever' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException for incorrect password', async () => {
    usersService.findByEmail.mockResolvedValue(mockUser as any);

    await expect(
      service.login({ email: 'test@example.com', password: 'wrong-password' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
