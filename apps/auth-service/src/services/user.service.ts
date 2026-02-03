/**
 * SF-1 Ultimate - User Service
 * =============================
 *
 * Datei: user.service.ts
 * Speicherort: /SF-1-Ultimate/auth-service/src/services/
 * Service: auth-service (Port 3001)
 *
 * Verwaltet User-Operationen mit Prisma ORM und argon2 Password Hashing
 */

import { PrismaClient, User, UserRole } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

/**
 * Interface für User-Creation
 */
export interface CreateUserDto {
  email: string;
  password: string;
  name?: string;
  role?: 'user' | 'premium' | 'moderator' | 'admin';
  provider?: 'LOCAL' | 'GOOGLE' | 'DISCORD';
  providerId?: string;
}

/**
 * User Service mit Prisma ORM
 */
export class UserService {
  /**
   * Findet User anhand Email
   * @param email - User Email
   * @returns User oder null
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      });
      return user;
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }

  /**
   * Findet User anhand ID
   * @param id - User ID (CUID)
   * @returns User oder null
   */
  async findById(id: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id }
      });
      return user;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      return null;
    }
  }

  /**
   * Findet User anhand Username
   * @param username - Username
   * @returns User oder null
   */
  async findByUsername(username: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { username }
      });
      return user;
    } catch (error) {
      console.error('Error finding user by username:', error);
      return null;
    }
  }

  /**
   * Erstellt neuen User mit gehashtem Passwort
   * @param userData - User-Daten (email, password, name, role)
   * @returns Erstellter User
   */
  async create(userData: CreateUserDto): Promise<User> {
    try {
      // Hash password mit argon2 (sicherer als bcrypt)
      const passwordHash = await argon2.hash(userData.password, {
        type: argon2.argon2id, // Argon2id ist der empfohlene Type
        memoryCost: 65536,     // 64 MB
        timeCost: 3,           // 3 Iterationen
        parallelism: 4         // 4 Threads
      });

      // Map role string to Prisma UserRole Enum
      let roleEnum: UserRole = UserRole.USER;
      if (userData.role) {
        const roleMap: Record<string, UserRole> = {
          'user': UserRole.USER,
          'premium': UserRole.PREMIUM,
          'moderator': UserRole.MODERATOR,
          'admin': UserRole.ADMIN
        };
        roleEnum = roleMap[userData.role] || UserRole.USER;
      }

      // Erstelle User in DB
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          username: userData.name || userData.email.split('@')[0],
          passwordHash,
          role: roleEnum,
          provider: userData.provider || 'LOCAL',
          providerId: userData.providerId,
          isVerified: false,
          isActive: true,
          isBanned: false
        }
      });

      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('User creation failed');
    }
  }

  /**
   * Verifiziert User Passwort
   * @param user - User Objekt aus DB
   * @param password - Plaintext Passwort zum Vergleich
   * @returns true wenn Passwort korrekt
   */
  async verifyPassword(user: User, password: string): Promise<boolean> {
    try {
      if (!user.passwordHash) {
        return false; // OAuth User haben kein Passwort
      }

      return await argon2.verify(user.passwordHash, password);
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  /**
   * Update Last Login Timestamp
   * @param userId - User ID
   */
  async updateLastLogin(userId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  /**
   * Update User Password
   * @param userId - User ID
   * @param newPassword - Neues Passwort (plaintext)
   */
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    try {
      const passwordHash = await argon2.hash(newPassword, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4
      });

      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash }
      });
    } catch (error) {
      console.error('Error updating password:', error);
      throw new Error('Password update failed');
    }
  }

  /**
   * Prüft ob Email bereits registriert ist
   * @param email - Email zum Prüfen
   * @returns true wenn Email existiert
   */
  async emailExists(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return user !== null;
  }

  /**
   * Cleanup - Schließt Prisma Connection
   */
  async disconnect(): Promise<void> {
    await prisma.$disconnect();
  }
}

/**
 * Singleton Export
 */
export const userService = new UserService();
