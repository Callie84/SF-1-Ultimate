// /apps/ai-service/src/services/diagnosis.service.ts
import { openai, MODELS, SYSTEM_PROMPTS } from '../config/openai';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

export interface DiagnosisInput {
  images: string[]; // Base64 or URLs
  symptoms?: string;
  growSetup?: {
    medium?: string;
    nutrients?: string;
    lights?: string;
    ph?: number;
    ec?: number;
    temperature?: number;
    humidity?: number;
  };
  stage?: 'seedling' | 'vegetative' | 'flowering';
}

/** Format das das Frontend erwartet */
export interface DiagnosisResult {
  problem: string;
  confidence: number; // 0-1
  description: string;
  causes: string[];
  solutions: string[];
  severity: 'low' | 'medium' | 'high';
}

const DIAGNOSIS_JSON_PROMPT = `
Antworte IMMER im folgenden JSON-Format (keine anderen Texte drumherum):
{
  "diagnoses": [
    {
      "problem": "Name des Problems",
      "confidence": 0.85,
      "description": "Detaillierte Beschreibung des Problems",
      "causes": ["Ursache 1", "Ursache 2"],
      "solutions": ["Lösung Schritt 1", "Lösung Schritt 2"],
      "severity": "low|medium|high"
    }
  ]
}

Regeln:
- confidence ist eine Zahl zwischen 0 und 1
- severity ist "low", "medium" oder "high"
- Gib 1-3 Diagnosen zurück, sortiert nach Wahrscheinlichkeit
- Jede Diagnose muss mindestens 1 Ursache und 1 Lösung haben
`;

export class DiagnosisService {
  /**
   * Plant Problem Diagnosis via GPT-4o Vision
   */
  async diagnose(input: DiagnosisInput): Promise<{ diagnoses: DiagnosisResult[] }> {
    try {
      logger.info('[Diagnosis] Starting analysis...');

      const userPrompt = this.buildDiagnosisPrompt(input);

      const response = await openai.chat.completions.create({
        model: MODELS.GPT4O,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPTS.DIAGNOSIS + '\n\n' + DIAGNOSIS_JSON_PROMPT
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userPrompt
              },
              ...input.images.map(img => ({
                type: 'image_url' as const,
                image_url: {
                  url: img,
                  detail: 'high' as const
                }
              }))
            ]
          }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 2000,
        temperature: 0.3
      });

      const content = response.choices[0].message.content || '{}';

      try {
        const parsed = JSON.parse(content);
        const diagnoses = this.validateDiagnoses(parsed.diagnoses || []);
        logger.info('[Diagnosis] Completed:', diagnoses.length, 'problems found');
        return { diagnoses };
      } catch (parseError) {
        logger.error('[Diagnosis] JSON parse failed, using fallback:', parseError);
        return {
          diagnoses: [{
            problem: 'Analyse abgeschlossen',
            confidence: 0.7,
            description: content,
            causes: ['Konnte nicht strukturiert analysiert werden'],
            solutions: ['Bitte versuche es erneut mit klareren Bildern'],
            severity: 'medium'
          }]
        };
      }

    } catch (error) {
      logger.error('[Diagnosis] Failed:', error);
      throw error;
    }
  }

  /**
   * Quick Diagnosis (ohne Bild, nur Text)
   */
  async quickDiagnose(symptoms: string, setup?: any): Promise<{ diagnoses: DiagnosisResult[] }> {
    try {
      const prompt = `
        Symptome: ${symptoms}
        ${setup ? `Setup: ${JSON.stringify(setup)}` : ''}

        Bitte diagnostiziere das Problem und gib Empfehlungen.
      `;

      const response = await openai.chat.completions.create({
        model: MODELS.GPT4O_MINI,
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.DIAGNOSIS + '\n\n' + DIAGNOSIS_JSON_PROMPT },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1500,
        temperature: 0.3
      });

      const content = response.choices[0].message.content || '{}';

      try {
        const parsed = JSON.parse(content);
        const diagnoses = this.validateDiagnoses(parsed.diagnoses || []);
        return { diagnoses };
      } catch (parseError) {
        logger.error('[Diagnosis] Quick diagnose JSON parse failed:', parseError);
        return {
          diagnoses: [{
            problem: 'Schnell-Analyse',
            confidence: 0.6,
            description: content,
            causes: ['Textbasierte Analyse'],
            solutions: ['Für genauere Ergebnisse lade Bilder hoch'],
            severity: 'medium'
          }]
        };
      }

    } catch (error) {
      logger.error('[Diagnosis] Quick diagnose failed:', error);
      throw error;
    }
  }

  /**
   * Batch Diagnosis (mehrere Pflanzen gleichzeitig)
   */
  async batchDiagnose(inputs: DiagnosisInput[]): Promise<{ diagnoses: DiagnosisResult[] }[]> {
    const results = await Promise.all(
      inputs.map(input => this.diagnose(input))
    );
    return results;
  }

  /**
   * Validate und normalize Diagnose-Ergebnisse
   */
  private validateDiagnoses(raw: any[]): DiagnosisResult[] {
    if (!Array.isArray(raw)) return [];

    return raw.map(item => ({
      problem: String(item.problem || 'Unbekanntes Problem'),
      confidence: typeof item.confidence === 'number'
        ? Math.min(1, Math.max(0, item.confidence))
        : 0.5,
      description: String(item.description || item.problem || ''),
      causes: Array.isArray(item.causes) ? item.causes.map(String) : [],
      solutions: Array.isArray(item.solutions) ? item.solutions.map(String) : [],
      severity: ['low', 'medium', 'high'].includes(item.severity)
        ? item.severity
        : 'medium'
    }));
  }

  /**
   * Prompt für Diagnose erstellen
   */
  private buildDiagnosisPrompt(input: DiagnosisInput): string {
    let prompt = 'Bitte analysiere diese Cannabis-Pflanze und diagnostiziere mögliche Probleme.\n\n';

    if (input.symptoms) {
      prompt += `**Symptome:** ${input.symptoms}\n\n`;
    }

    if (input.stage) {
      prompt += `**Wachstumsphase:** ${input.stage}\n\n`;
    }

    if (input.growSetup) {
      prompt += '**Grow-Setup:**\n';
      for (const [key, value] of Object.entries(input.growSetup)) {
        if (value !== undefined) {
          prompt += `- ${key}: ${value}\n`;
        }
      }
      prompt += '\n';
    }

    return prompt;
  }

  /**
   * Häufige Probleme (Cached)
   */
  async getCommonProblems(): Promise<Array<{
    name: string;
    symptoms: string[];
    image?: string;
  }>> {
    const cacheKey = 'ai:common-problems';

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      // Redis nicht verfügbar, weiter ohne Cache
    }

    const problems = [
      {
        name: 'Nährstoffmangel (Stickstoff)',
        symptoms: ['Gelbe untere Blätter', 'Langsames Wachstum', 'Blasse Blätter']
      },
      {
        name: 'Nährstoffverbrennung',
        symptoms: ['Braune Blattspitzen', 'Gekräuselte Blätter', 'Dunkle Verfärbungen']
      },
      {
        name: 'Überwässerung',
        symptoms: ['Hängende Blätter', 'Gelbe Blätter', 'Wurzelfäule']
      },
      {
        name: 'Unterwässerung',
        symptoms: ['Trockene Erde', 'Hängende Blätter', 'Knusprige Blätter']
      },
      {
        name: 'Lichtbrand',
        symptoms: ['Gebleichte Blätter', 'Braune Flecken', 'Verbrannte Spitzen']
      },
      {
        name: 'pH-Problem',
        symptoms: ['Flecken auf Blättern', 'Nährstoffsperre', 'Verfärbungen']
      },
      {
        name: 'Schädlinge (Spinnmilben)',
        symptoms: ['Kleine Punkte auf Blättern', 'Gespinste', 'Blätter sterben ab']
      },
      {
        name: 'Pilzbefall',
        symptoms: ['Weiße Flecken', 'Schimmel', 'Faulstellen']
      }
    ];

    try {
      await redis.setex(cacheKey, 86400, JSON.stringify(problems));
    } catch (e) {
      // Redis nicht verfügbar
    }

    return problems;
  }
}

export const diagnosisService = new DiagnosisService();
