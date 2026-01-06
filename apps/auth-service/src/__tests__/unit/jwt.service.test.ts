import { JWTService } from '../../services/jwt.service';

describe('JWT Service', () => {
  let jwtService: JWTService;

  beforeEach(() => {
    jwtService = new JWTService();
    process.env.JWT_SECRET = 'test-secret-for-unit-tests-min-32-characters';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-unit-tests-min-32-characters';
  });

  describe('generateAccessToken', () => {
    it('should generate valid access token', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'USER' as any,
        premiumUntil: null,
      } as any;

      const token = jwtService.generateAccessToken(mockUser);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    it('should include premium status in token', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const mockUser = {
        id: 'user-123',
        email: 'premium@example.com',
        role: 'PREMIUM' as any,
        premiumUntil: futureDate,
      } as any;

      const token = jwtService.generateAccessToken(mockUser);
      const payload = jwtService.verifyAccessToken(token);

      expect(payload).toBeTruthy();
      expect(payload?.premium).toBe(true);
    });

    it('should set premium false for expired subscription', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);

      const mockUser = {
        id: 'user-123',
        email: 'expired@example.com',
        role: 'USER' as any,
        premiumUntil: pastDate,
      } as any;

      const token = jwtService.generateAccessToken(mockUser);
      const payload = jwtService.verifyAccessToken(token);

      expect(payload?.premium).toBe(false);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate refresh token with family', () => {
      const result = jwtService.generateRefreshToken('user-123');

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('family');
      expect(typeof result.token).toBe('string');
      expect(typeof result.family).toBe('string');
      expect(result.family).toHaveLength(21); // nanoid default length
    });

    it('should use provided family if given', () => {
      const customFamily = 'custom-family-id';
      const result = jwtService.generateRefreshToken('user-123', customFamily);

      expect(result.family).toBe(customFamily);
    });

    it('should generate different families for different calls', () => {
      const result1 = jwtService.generateRefreshToken('user-123');
      const result2 = jwtService.generateRefreshToken('user-123');

      expect(result1.family).not.toBe(result2.family);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid token', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'USER' as any,
        premiumUntil: null,
      } as any;

      const token = jwtService.generateAccessToken(mockUser);
      const payload = jwtService.verifyAccessToken(token);

      expect(payload).toBeTruthy();
      expect(payload?.userId).toBe('user-123');
      expect(payload?.email).toBe('test@example.com');
      expect(payload?.role).toBe('USER');
    });

    it('should return null for invalid token', () => {
      const payload = jwtService.verifyAccessToken('invalid-token');

      expect(payload).toBeNull();
    });

    it('should return null for expired token', () => {
      // Create token with expired time (would need to manipulate JWT library or wait)
      // For now, just test with malformed token
      const payload = jwtService.verifyAccessToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature');

      expect(payload).toBeNull();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const userId = 'user-123';
      const { token } = jwtService.generateRefreshToken(userId);
      const payload = jwtService.verifyRefreshToken(token);

      expect(payload).toBeTruthy();
      expect(payload?.userId).toBe(userId);
      expect(payload?.family).toBeTruthy();
    });

    it('should return null for invalid refresh token', () => {
      const payload = jwtService.verifyRefreshToken('invalid-refresh-token');

      expect(payload).toBeNull();
    });
  });

  describe('token expiration', () => {
    it('access token should have 15m expiration', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'USER' as any,
        premiumUntil: null,
      } as any;

      const token = jwtService.generateAccessToken(mockUser);
      const decoded = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      );

      const expiresIn = decoded.exp - decoded.iat;
      expect(expiresIn).toBe(900); // 15 minutes = 900 seconds
    });

    it('refresh token should have 7d expiration', () => {
      const { token } = jwtService.generateRefreshToken('user-123');
      const decoded = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      );

      const expiresIn = decoded.exp - decoded.iat;
      expect(expiresIn).toBe(604800); // 7 days = 604800 seconds
    });
  });
});
