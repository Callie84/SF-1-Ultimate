import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const router = Router();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Sentry Webhook Signatur verifizieren
function verifySignature(body: string, signature: string, secret: string): boolean {
  if (!secret || !signature) return true; // Kein Secret konfiguriert = kein Check
  const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return signature === hmac;
}

// Betroffene Datei aus dem Codebase laden
function findSourceFile(filename: string): string | null {
  if (!filename) return null;

  // Mögliche Basispfade im Container
  const basePaths = ['/app', '/root/SF-1-Ultimate-/apps'];

  // Typische Pfadbereinigung von Sentry-Frames
  const cleanName = filename
    .replace(/^.*\/apps\//, 'apps/')
    .replace(/^.*\/src\//, 'src/')
    .replace(/\?.*$/, '');

  for (const base of basePaths) {
    const candidates = [
      path.join(base, cleanName),
      path.join(base, filename),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return fs.readFileSync(candidate, 'utf8');
      }
    }
  }
  return null;
}

// Stack Trace aus Sentry-Payload extrahieren
function extractStackTrace(issue: any): {
  title: string;
  type: string;
  value: string;
  frames: Array<{ filename: string; lineNo: number; function: string }>;
  culpritFile: string | null;
  culpritContent: string | null;
} {
  const title = issue.title || 'Unbekannter Fehler';
  const entries = issue.entries || [];
  const exceptionEntry = entries.find((e: any) => e.type === 'exception');

  let type = '';
  let value = '';
  let frames: Array<{ filename: string; lineNo: number; function: string }> = [];

  if (exceptionEntry?.data?.values?.length > 0) {
    const exc = exceptionEntry.data.values[0];
    type = exc.type || '';
    value = exc.value || '';
    const rawFrames = exc.stacktrace?.frames || [];
    frames = rawFrames
      .filter((f: any) => f.filename && !f.filename.includes('node_modules'))
      .slice(-5) // Letzte 5 relevante Frames
      .map((f: any) => ({
        filename: f.filename,
        lineNo: f.lineNo || 0,
        function: f.function || '<anonymous>',
      }));
  }

  // Betroffenste Datei: letzter Frame ohne node_modules
  const culpritFrame = frames[frames.length - 1];
  let culpritFile: string | null = null;
  let culpritContent: string | null = null;

  if (culpritFrame?.filename) {
    culpritContent = findSourceFile(culpritFrame.filename);
    culpritFile = culpritFrame.filename;
  }

  return { title, type, value, frames, culpritFile, culpritContent };
}

// Claude analysiert den Fehler und schlägt einen Fix vor
async function analyzeWithClaude(issueData: ReturnType<typeof extractStackTrace>, platform: string): Promise<string> {
  const { title, type, value, frames, culpritFile, culpritContent } = issueData;

  const stackTraceText = frames
    .map(f => `  at ${f.function} (${f.filename}:${f.lineNo})`)
    .join('\n');

  const fileSection = culpritContent
    ? `\n\nBetroffene Datei (${culpritFile}):\n\`\`\`typescript\n${culpritContent.slice(0, 3000)}\n\`\`\``
    : '';

  const prompt = `Du bist ein erfahrener TypeScript/Node.js Entwickler. Analysiere diesen Produktionsfehler aus einer Express-Microservice-Plattform (SF-1 Cannabis Community Platform) und schlage einen konkreten Fix vor.

**Fehler:** ${title}
**Typ:** ${type}
**Nachricht:** ${value}
**Plattform:** ${platform}

**Stack Trace:**
\`\`\`
${stackTraceText}
\`\`\`
${fileSection}

Antworte auf Deutsch in folgendem Format:

## Ursache
[1-2 Sätze: Was ist die wahrscheinliche Ursache?]

## Betroffene Stelle
[Datei:Zeile und betroffene Funktion]

## Fix
\`\`\`typescript
[Konkreter Code-Fix mit Erklärung als Kommentar]
\`\`\`

## Wie anwenden
[1-3 Schritte wie man den Fix implementiert]

## Sicherheit
[Einschätzung: Ist dieser Fix sicher automatisch anzuwenden? Ja/Nein + Begründung]`;

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = message.content.find(b => b.type === 'text');
  return textBlock ? (textBlock as any).text : 'Keine Analyse verfügbar.';
}

// Fix-Vorschlag per Telegram senden
async function sendTelegramNotification(issue: any, analysis: string, sentryUrl: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn('[AutoFix] TELEGRAM_BOT_TOKEN oder TELEGRAM_CHAT_ID fehlt — keine Benachrichtigung');
    return;
  }

  const firstSeen = new Date(issue.firstSeen).toLocaleString('de-DE');
  const platform = issue.platform || 'Unbekannt';

  // Telegram-Nachricht: max 4096 Zeichen, in 2 Teile aufgeteilt
  const header = `🔴 *Neuer Sentry-Fehler*\n\n` +
    `*Fehler:* ${escapeMarkdown(issue.title?.slice(0, 200))}\n` +
    `*Plattform:* ${escapeMarkdown(platform)}\n` +
    `*Erstes Auftreten:* ${firstSeen}\n` +
    `*Sentry:* [Issue öffnen](${sentryUrl})`;

  const analysisMsg = `🤖 *Claude-Analyse:*\n\n${analysis.slice(0, 3500)}\n\n⚠️ Fix-Vorschlag prüfen bevor anwenden\\.`;

  await telegramSend(token, chatId, header, 'MarkdownV2');
  await telegramSend(token, chatId, analysisMsg, 'MarkdownV2');
}

function escapeMarkdown(text: string): string {
  return (text || '').replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

async function telegramSend(token: string, chatId: string, text: string, parseMode: string): Promise<void> {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
  });
  if (!res.ok) {
    const err = await res.text();
    // Fallback: ohne Markdown senden
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text.replace(/[\\*_[\]()~`>#+\-=|{}.!]/g, ''), parse_mode: '' }),
    });
    console.warn('[AutoFix] Telegram Markdown-Fehler, Fallback ohne Formatierung:', err);
  }
}

// POST /api/tools/sentry-webhook
router.post('/sentry-webhook', async (req: Request, res: Response) => {
  try {
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['sentry-hook-signature'] as string || '';
    const secret = process.env.SENTRY_WEBHOOK_SECRET || '';

    // Signatur prüfen
    if (secret && !verifySignature(rawBody, signature, secret)) {
      return res.status(401).json({ error: 'Ungültige Signatur' });
    }

    const { action, data } = req.body;

    // Nur neue Issues verarbeiten
    if (action !== 'created') {
      return res.status(200).json({ message: `Aktion '${action}' wird ignoriert` });
    }

    const issue = data?.issue;
    if (!issue) {
      return res.status(400).json({ error: 'Kein Issue in Payload' });
    }

    // Sofort antworten (Sentry erwartet schnelle Antwort)
    res.status(200).json({ message: 'Webhook empfangen, Analyse läuft' });

    // Analyse asynchron im Hintergrund
    (async () => {
      try {
        const issueData = extractStackTrace(issue);
        const analysis = await analyzeWithClaude(issueData, issue.platform || 'node');
        const sentryUrl = issue.permalink || `https://sentry.io/issues/${issue.id}`;
        await sendTelegramNotification(issue, analysis, sentryUrl);
        console.log(`[AutoFix] Fix-Vorschlag für Issue ${issue.id} per Telegram gesendet`);
      } catch (err) {
        console.error('[AutoFix] Fehler bei Analyse:', err);
      }
    })();

  } catch (err: any) {
    console.error('[AutoFix] Webhook-Fehler:', err);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

export default router;
