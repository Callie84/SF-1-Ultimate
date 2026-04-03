import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Prüft ob der Beta-Modus aktiv ist (aktuelles Datum vor BETA_END_DATE).
 */
export function isBetaActive(): boolean {
  const endDate = process.env.BETA_END_DATE;
  if (!endDate) return false;
  return new Date() < new Date(endDate);
}

/**
 * Gibt die Anzahl der registrierten Beta-User zurück (ohne Admin-Account).
 */
export async function getBetaUserCount(): Promise<number> {
  const adminEmail = process.env.BETA_ADMIN_EMAIL || 'klingenpascal@gmail.com';
  return prisma.user.count({
    where: { email: { not: adminEmail } },
  });
}

/**
 * Prüft ob Beta-Limit erreicht ist.
 * @returns { blocked: true, message: '...' } wenn Beta voll ist, sonst { blocked: false }
 */
export async function checkBetaLimit(): Promise<{ blocked: boolean; message?: string }> {
  if (!isBetaActive()) {
    return { blocked: false };
  }

  const limit = parseInt(process.env.BETA_LIMIT || '50', 10);
  const count = await getBetaUserCount();

  if (count >= limit) {
    return {
      blocked: true,
      message: `Alle ${limit} Beta-Plätze sind vergeben. Der offizielle Launch findet Anfang April statt — komm dann wieder!`,
    };
  }

  return { blocked: false };
}
