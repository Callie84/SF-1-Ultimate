// Auth Service — Token Service (DB-backed Refresh Token Rotation)
import { prisma } from '../config/database';
import { jwtService } from './jwt.service';
import { redis } from '../config/redis';
import { User } from '@prisma/client';

const REFRESH_TOKEN_TTL_DAYS = 7;

/**
 * Speichert einen neuen Refresh Token in der DB.
 * Gibt token + family zurück.
 */
export async function createRefreshToken(userId: string, family?: string): Promise<{ token: string; family: string }> {
  const { token, family: tokenFamily } = jwtService.generateRefreshToken(userId, family);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { userId, token, family: tokenFamily, expiresAt },
  });

  return { token, family: tokenFamily };
}

/**
 * Rotiert einen Refresh Token:
 * - Prüft ob Token in DB existiert
 * - Bei Token-Reuse (nicht in DB) → gesamte Family invalidieren → null
 * - Bei gültigem Token → altes löschen, neues erstellen
 * Gibt { accessToken, refreshToken } zurück oder null bei Angriff.
 */
export async function rotateRefreshToken(
  refreshToken: string,
  user: User
): Promise<{ accessToken: string; refreshToken: string } | null> {
  // 1. JWT-Signatur prüfen
  const payload = jwtService.verifyRefreshToken(refreshToken);
  if (!payload) return null;

  // 2. Token in DB suchen
  const dbToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });

  if (!dbToken) {
    // Token-Reuse-Angriff: Token existiert nicht mehr in DB (wurde schon benutzt)
    // Gesamte Familie invalidieren
    await prisma.refreshToken.deleteMany({
      where: { family: payload.family, userId: payload.userId },
    });
    return null;
  }

  // 3. Abgelaufen?
  if (dbToken.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { token: refreshToken } });
    return null;
  }

  // 4. Altes Token löschen
  await prisma.refreshToken.delete({ where: { token: refreshToken } });

  // 5. Neues Token der gleichen Familie erstellen
  const { token: newRefreshToken } = await createRefreshToken(user.id, dbToken.family);
  const newAccessToken = jwtService.generateAccessToken(user);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

/**
 * Löscht einen spezifischen Refresh Token beim Logout.
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  try {
    await prisma.refreshToken.delete({ where: { token } });
  } catch {
    // Token existiert nicht — kein Fehler
  }
}

/**
 * Löscht alle Refresh Tokens eines Users (Logout everywhere).
 */
export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

/**
 * Fügt einen Access Token zur Redis-Blacklist hinzu (bei Logout).
 * TTL = verbleibende Token-Laufzeit — Token wird automatisch aus Redis entfernt.
 */
export async function blacklistAccessToken(token: string, expiresAt: number): Promise<void> {
  try {
    const ttl = expiresAt - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await redis.setEx(`blacklist:${token}`, ttl, '1');
    }
  } catch {
    // Redis-Fehler: fail-open (Token läuft sowieso nach 15min ab)
  }
}

/**
 * Prüft ob ein Access Token auf der Blacklist steht.
 */
export async function isAccessTokenBlacklisted(token: string): Promise<boolean> {
  try {
    return (await redis.get(`blacklist:${token}`)) === '1';
  } catch {
    return false; // fail-open: wenn Redis down, Token durchlassen
  }
}

/**
 * Löscht abgelaufene Tokens (Cleanup-Job).
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}
