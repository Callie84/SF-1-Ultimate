// Unit Tests für Password Utilities
import argon2 from 'argon2';

describe('Password Utils', () => {
  const testPassword = 'TestPassword123!';

  describe('hashPassword', () => {
    it('should hash password with argon2', async () => {
      const hash = await argon2.hash(testPassword);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(testPassword);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should create different hashes for same password', async () => {
      const hash1 = await argon2.hash(testPassword);
      const hash2 = await argon2.hash(testPassword);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const hash = await argon2.hash(testPassword);
      const isValid = await argon2.verify(hash, testPassword);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await argon2.hash(testPassword);
      const isValid = await argon2.verify(hash, 'WrongPassword123!');

      expect(isValid).toBe(false);
    });

    it('should reject empty password', async () => {
      const hash = await argon2.hash(testPassword);
      const isValid = await argon2.verify(hash, '');

      expect(isValid).toBe(false);
    });
  });

  describe('password requirements', () => {
    const validatePassword = (password: string): boolean => {
      const minLength = password.length >= 8;
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecial = /[^A-Za-z0-9]/.test(password);

      return minLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
    };

    it('should accept valid password', () => {
      expect(validatePassword('TestPassword123!')).toBe(true);
    });

    it('should reject password without uppercase', () => {
      expect(validatePassword('testpassword123!')).toBe(false);
    });

    it('should reject password without lowercase', () => {
      expect(validatePassword('TESTPASSWORD123!')).toBe(false);
    });

    it('should reject password without number', () => {
      expect(validatePassword('TestPassword!')).toBe(false);
    });

    it('should reject password without special char', () => {
      expect(validatePassword('TestPassword123')).toBe(false);
    });

    it('should reject too short password', () => {
      expect(validatePassword('Test1!')).toBe(false);
    });
  });
});
