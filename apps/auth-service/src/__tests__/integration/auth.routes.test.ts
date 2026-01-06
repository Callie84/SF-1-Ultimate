import request from 'supertest';
import express from 'express';
import authRoutes from '../../routes/auth.routes';
import { userService } from '../../services/user.service';
import { jwtService } from '../../services/jwt.service';

// Mock services
jest.mock('../../services/user.service');
jest.mock('../../services/jwt.service');

describe('Auth Routes Integration', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'new-user-id',
        email: 'newuser@example.com',
        name: 'New User',
        role: 'USER',
      };

      (userService.findByEmail as jest.Mock).mockResolvedValue(null);
      (userService.create as jest.Mock).mockResolvedValue(mockUser);
      (jwtService.generateAccessToken as jest.Mock).mockReturnValue('access-token');
      (jwtService.generateRefreshToken as jest.Mock).mockReturnValue({
        token: 'refresh-token',
        family: 'token-family',
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePassword123!',
          name: 'New User',
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        message: 'Registration erfolgreich',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: 'new-user-id',
          email: 'newuser@example.com',
          name: 'New User',
          role: 'USER',
        },
      });

      expect(userService.findByEmail).toHaveBeenCalledWith('newuser@example.com');
      expect(userService.create).toHaveBeenCalled();
    });

    it('should reject registration with existing email', async () => {
      (userService.findByEmail as jest.Mock).mockResolvedValue({
        id: 'existing-user',
        email: 'existing@example.com',
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'SecurePassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Email bereits registriert',
      });

      expect(userService.create).not.toHaveBeenCalled();
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validierung fehlgeschlagen');
    });

    it('should validate password length', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'short',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validierung fehlgeschlagen');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user with correct credentials', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
        name: 'Test User',
        role: 'USER',
      };

      (userService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (userService.verifyPassword as jest.Mock).mockResolvedValue(true);
      (userService.updateLastLogin as jest.Mock).mockResolvedValue(undefined);
      (jwtService.generateAccessToken as jest.Mock).mockReturnValue('access-token');
      (jwtService.generateRefreshToken as jest.Mock).mockReturnValue({
        token: 'refresh-token',
        family: 'token-family',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'CorrectPassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: 'Login erfolgreich',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: 'user-id',
          email: 'user@example.com',
          name: 'Test User',
          role: 'USER',
        },
      });

      expect(userService.verifyPassword).toHaveBeenCalledWith(
        mockUser,
        'CorrectPassword123!'
      );
      expect(userService.updateLastLogin).toHaveBeenCalledWith('user-id');
    });

    it('should reject login with wrong password', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
      };

      (userService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (userService.verifyPassword as jest.Mock).mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'WrongPassword',
        });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Ungültige Credentials',
      });

      expect(userService.updateLastLogin).not.toHaveBeenCalled();
    });

    it('should reject login with non-existent email', async () => {
      (userService.findByEmail as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'AnyPassword',
        });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Ungültige Credentials',
      });
    });
  });

  describe('GET /api/auth/verify', () => {
    it('should verify valid JWT token', async () => {
      const mockPayload = {
        userId: 'user-id',
        email: 'user@example.com',
        role: 'user',
      };

      (jwtService.verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        valid: true,
        userId: 'user-id',
        email: 'user@example.com',
        role: 'user',
      });

      expect(response.headers['x-user-id']).toBe('user-id');
      expect(response.headers['x-user-role']).toBe('user');
      expect(response.headers['x-user-email']).toBe('user@example.com');
    });

    it('should reject request without token', async () => {
      const response = await request(app).get('/api/auth/verify');

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('NO_AUTH_HEADER');
    });

    it('should reject invalid token format', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'InvalidFormat token');

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('INVALID_AUTH_FORMAT');
    });

    it('should reject invalid token', async () => {
      (jwtService.verifyAccessToken as jest.Mock).mockReturnValue(null);

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('INVALID_TOKEN');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
        role: 'USER',
      };

      (jwtService.verifyRefreshToken as jest.Mock).mockReturnValue({
        userId: 'user-id',
        family: 'token-family',
      });
      (userService.findById as jest.Mock).mockResolvedValue(mockUser);
      (jwtService.generateAccessToken as jest.Mock).mockReturnValue('new-access-token');
      (jwtService.generateRefreshToken as jest.Mock).mockReturnValue({
        token: 'new-refresh-token',
        family: 'token-family',
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'valid-refresh-token',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        message: 'Tokens refreshed successfully',
      });
    });

    it('should reject invalid refresh token', async () => {
      (jwtService.verifyRefreshToken as jest.Mock).mockReturnValue(null);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid refresh token');
    });

    it('should reject if user not found', async () => {
      (jwtService.verifyRefreshToken as jest.Mock).mockReturnValue({
        userId: 'non-existent-user',
      });
      (userService.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'valid-refresh-token',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('User not found');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app).post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logout successful');
    });
  });
});
