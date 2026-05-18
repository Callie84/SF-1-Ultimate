import { UserService } from '../../services/user.service';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $disconnect: jest.fn(),
  };
  return { PrismaClient: jest.fn(() => mockPrismaClient) };
});

jest.mock('argon2');

describe('UserService', () => {
  let userService: UserService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const mockUser = {
        id: 'test-id',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashed',
        role: 'USER',
        provider: 'LOCAL',
        providerId: null,
        premiumUntil: null,
        avatar: null,
        bio: null,
        isVerified: false,
        isActive: true,
        isBanned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await userService.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await userService.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('DB Error'));

      const result = await userService.findByEmail('test@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const mockUser = {
        id: 'test-id',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashed',
        role: 'USER',
        provider: 'LOCAL',
        providerId: null,
        premiumUntil: null,
        avatar: null,
        bio: null,
        isVerified: false,
        isActive: true,
        isBanned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await userService.findById('test-id');

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });
    });
  });

  describe('create', () => {
    it('should create user with hashed password', async () => {
      const mockHashedPassword = '$argon2id$v=19$m=65536,t=3,p=4$hash';
      (argon2.hash as jest.Mock).mockResolvedValue(mockHashedPassword);

      const mockCreatedUser = {
        id: 'new-user-id',
        email: 'newuser@example.com',
        username: 'newuser',
        passwordHash: mockHashedPassword,
        role: 'USER',
        provider: 'LOCAL',
        providerId: null,
        premiumUntil: null,
        avatar: null,
        bio: null,
        isVerified: false,
        isActive: true,
        isBanned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.create.mockResolvedValue(mockCreatedUser);

      const result = await userService.create({
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        name: 'New User',
      });

      expect(argon2.hash).toHaveBeenCalledWith(
        'SecurePassword123!',
        expect.objectContaining({
          type: argon2.argon2id,
          memoryCost: 65536,
          timeCost: 3,
          parallelism: 4,
        })
      );

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'newuser@example.com',
          username: 'New User',
          passwordHash: mockHashedPassword,
          role: 'USER',
          provider: 'LOCAL',
        }),
      });

      expect(result).toEqual(mockCreatedUser);
    });

    it('should use email username if name not provided', async () => {
      (argon2.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.user.create.mockResolvedValue({} as any);

      await userService.create({
        email: 'test@example.com',
        password: 'password',
      });

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          username: 'test',
        }),
      });
    });

    it('should map role correctly', async () => {
      (argon2.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.user.create.mockResolvedValue({} as any);

      await userService.create({
        email: 'admin@example.com',
        password: 'password',
        role: 'admin',
      });

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role: 'ADMIN',
        }),
      });
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const mockUser = {
        id: 'test-id',
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$hash',
      } as any;

      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await userService.verifyPassword(mockUser, 'CorrectPassword');

      expect(argon2.verify).toHaveBeenCalledWith(
        mockUser.passwordHash,
        'CorrectPassword'
      );
      expect(result).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const mockUser = {
        id: 'test-id',
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$hash',
      } as any;

      (argon2.verify as jest.Mock).mockResolvedValue(false);

      const result = await userService.verifyPassword(mockUser, 'WrongPassword');

      expect(result).toBe(false);
    });

    it('should return false for OAuth users without password', async () => {
      const mockUser = {
        id: 'test-id',
        passwordHash: null,
      } as any;

      const result = await userService.verifyPassword(mockUser, 'AnyPassword');

      expect(result).toBe(false);
      expect(argon2.verify).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const mockUser = {
        id: 'test-id',
        passwordHash: 'hash',
      } as any;

      (argon2.verify as jest.Mock).mockRejectedValue(new Error('Verify error'));

      const result = await userService.verifyPassword(mockUser, 'password');

      expect(result).toBe(false);
    });
  });

  describe('updateLastLogin', () => {
    it('should update user lastLogin timestamp', async () => {
      mockPrisma.user.update.mockResolvedValue({});

      await userService.updateLastLogin('test-id');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: {
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.user.update.mockRejectedValue(new Error('Update error'));

      await expect(
        userService.updateLastLogin('test-id')
      ).resolves.not.toThrow();
    });
  });

  describe('emailExists', () => {
    it('should return true if email exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'test-id' });

      const result = await userService.emailExists('existing@example.com');

      expect(result).toBe(true);
    });

    it('should return false if email does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await userService.emailExists('nonexistent@example.com');

      expect(result).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should disconnect prisma client', async () => {
      await userService.disconnect();

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });
});
