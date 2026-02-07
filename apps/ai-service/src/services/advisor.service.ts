// /apps/ai-service/src/services/advisor.service.ts
import { openai, MODELS, SYSTEM_PROMPTS } from '../config/openai';
import { logger } from '../utils/logger';

export interface AdvisorInput {
  question: string;
  userContext?: {
    experienceLevel?: 'beginner' | 'intermediate' | 'expert';
    growType?: 'indoor' | 'outdoor' | 'greenhouse';
    budget?: 'low' | 'medium' | 'high';
    goals?: string[];
    equipment?: string[];
  };
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

/** Format das das Frontend erwartet */
export interface AdvisorResult {
  strainRecommendations: Array<{
    name: string;
    genetics: string;
    thc: string;
    flowering: string;
    difficulty: string;
    reason: string;
  }>;
  setupAdvice: string[];
  timeline: Array<{
    week: number;
    phase: string;
    tasks: string[];
  }>;
  tips: string[];
}

const ADVISOR_JSON_PROMPT = `
Antworte IMMER im folgenden JSON-Format (keine anderen Texte drumherum):
{
  "strainRecommendations": [
    {
      "name": "Strain Name",
      "genetics": "Indica/Sativa/Hybrid + Prozent",
      "thc": "THC-Gehalt z.B. 18-22%",
      "flowering": "Blütezeit z.B. 8-9 Wochen",
      "difficulty": "Leicht/Mittel/Schwer",
      "reason": "Warum dieser Strain passt"
    }
  ],
  "setupAdvice": [
    "Setup-Empfehlung 1",
    "Setup-Empfehlung 2"
  ],
  "timeline": [
    {
      "week": 1,
      "phase": "Keimung",
      "tasks": ["Aufgabe 1", "Aufgabe 2"]
    }
  ],
  "tips": [
    "Pro-Tipp 1",
    "Pro-Tipp 2"
  ]
}

Regeln:
- Empfehle 3-5 Strains
- Gib 3-5 Setup-Empfehlungen
- Erstelle eine realistische Timeline (Keimung, Sämling, Vegetation, Blüte, Ernte)
- Gib 3-5 Pro-Tipps
`;

export class AdvisorService {
  /**
   * Personalisierter Grow-Plan (neues Format für Frontend)
   */
  async getGrowPlan(data: {
    experience: string;
    goal: string;
    growType: string;
    medium: string;
  }): Promise<AdvisorResult> {
    try {
      logger.info('[Advisor] Creating grow plan for:', data);

      const prompt = `
        Erstelle einen personalisierten Grow-Plan basierend auf:

        - Erfahrung: ${data.experience}
        - Ziel: ${data.goal}
        - Grow-Typ: ${data.growType}
        - Medium: ${data.medium}

        Berücksichtige das Erfahrungslevel bei allen Empfehlungen.
      `;

      const response = await openai.chat.completions.create({
        model: MODELS.GPT4O,
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.ADVISOR + '\n\n' + ADVISOR_JSON_PROMPT },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 3000,
        temperature: 0.7
      });

      const content = response.choices[0].message.content || '{}';

      try {
        const parsed = JSON.parse(content);
        return this.validateAdvisorResult(parsed);
      } catch (parseError) {
        logger.error('[Advisor] JSON parse failed:', parseError);
        return {
          strainRecommendations: [],
          setupAdvice: ['Es gab ein Problem bei der Analyse. Bitte versuche es erneut.'],
          timeline: [],
          tips: []
        };
      }

    } catch (error) {
      logger.error('[Advisor] Grow plan failed:', error);
      throw error;
    }
  }

  /**
   * Personalisierte Grow-Beratung (legacy/allgemein)
   */
  async getAdvice(input: AdvisorInput): Promise<AdvisorResult> {
    try {
      logger.info('[Advisor] Processing question:', input.question);

      const contextPrompt = this.buildContextPrompt(input);

      const messages: any[] = [
        { role: 'system', content: SYSTEM_PROMPTS.ADVISOR + '\n\n' + ADVISOR_JSON_PROMPT }
      ];

      if (input.conversationHistory) {
        messages.push(...input.conversationHistory);
      }

      messages.push({
        role: 'user',
        content: `${contextPrompt}\n\nFrage: ${input.question}`
      });

      const response = await openai.chat.completions.create({
        model: MODELS.GPT4O,
        messages,
        response_format: { type: 'json_object' },
        max_tokens: 3000,
        temperature: 0.7
      });

      const content = response.choices[0].message.content || '{}';

      try {
        const parsed = JSON.parse(content);
        return this.validateAdvisorResult(parsed);
      } catch (parseError) {
        logger.error('[Advisor] JSON parse failed:', parseError);
        return {
          strainRecommendations: [],
          setupAdvice: [content],
          timeline: [],
          tips: []
        };
      }

    } catch (error) {
      logger.error('[Advisor] Failed:', error);
      throw error;
    }
  }

  /**
   * Strain-Empfehlung
   */
  async recommendStrain(criteria: {
    experienceLevel: string;
    growType: string;
    goals: string[];
    budget?: string;
  }): Promise<{
    strains: Array<{
      name: string;
      reason: string;
      pros: string[];
      cons: string[];
    }>;
  }> {
    try {
      const prompt = `
        Empfiehl mir 3-5 Cannabis-Strains basierend auf:

        - Erfahrung: ${criteria.experienceLevel}
        - Grow-Typ: ${criteria.growType}
        - Ziele: ${criteria.goals.join(', ')}
        ${criteria.budget ? `- Budget: ${criteria.budget}` : ''}

        Format (JSON):
        {
          "strains": [
            {
              "name": "Strain Name",
              "reason": "Warum dieser Strain passt",
              "pros": ["Pro 1", "Pro 2"],
              "cons": ["Con 1", "Con 2"]
            }
          ]
        }
      `;

      const response = await openai.chat.completions.create({
        model: MODELS.GPT4O,
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.ADVISOR },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1500,
        temperature: 0.8
      });

      const content = response.choices[0].message.content || '{}';
      const result = JSON.parse(content);

      return result;

    } catch (error) {
      logger.error('[Advisor] Strain recommendation failed:', error);
      throw error;
    }
  }

  /**
   * Setup-Optimierung
   */
  async optimizeSetup(currentSetup: {
    space: string;
    lights: string;
    ventilation: string;
    medium: string;
    nutrients: string;
  }): Promise<{
    analysis: string;
    improvements: Array<{
      category: string;
      suggestion: string;
      priority: 'low' | 'medium' | 'high';
      estimatedCost?: string;
    }>;
    score: number;
  }> {
    try {
      const prompt = `
        Analysiere dieses Grow-Setup und gib Verbesserungsvorschläge:

        ${Object.entries(currentSetup).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

        Antworte im JSON-Format:
        {
          "analysis": "Gesamtbewertung des Setups",
          "improvements": [
            {
              "category": "Kategorie (z.B. Beleuchtung, Belüftung)",
              "suggestion": "Konkreter Vorschlag",
              "priority": "low|medium|high",
              "estimatedCost": "Geschätzte Kosten (optional)"
            }
          ],
          "score": 75
        }
      `;

      const response = await openai.chat.completions.create({
        model: MODELS.GPT4O,
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.ADVISOR },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 2000,
        temperature: 0.6
      });

      const content = response.choices[0].message.content || '{}';

      try {
        const parsed = JSON.parse(content);
        return {
          analysis: String(parsed.analysis || ''),
          improvements: Array.isArray(parsed.improvements)
            ? parsed.improvements.map((item: any) => ({
                category: String(item.category || ''),
                suggestion: String(item.suggestion || ''),
                priority: ['low', 'medium', 'high'].includes(item.priority) ? item.priority : 'medium',
                estimatedCost: item.estimatedCost ? String(item.estimatedCost) : undefined
              }))
            : [],
          score: typeof parsed.score === 'number' ? parsed.score : 75
        };
      } catch (parseError) {
        return {
          analysis: content,
          improvements: [],
          score: 75
        };
      }

    } catch (error) {
      logger.error('[Advisor] Setup optimization failed:', error);
      throw error;
    }
  }

  /**
   * Harvest-Timing-Advice
   */
  async harvestAdvice(input: {
    strain: string;
    weekInFlower: number;
    trichomeColor?: string;
    pistilColor?: string;
    images?: string[];
  }): Promise<{
    readyToHarvest: boolean;
    recommendation: string;
    estimatedDaysRemaining?: number;
    trichomeAnalysis?: string;
  }> {
    try {
      const prompt = `
        Beurteile die Erntereife dieser Cannabis-Pflanze:

        - Strain: ${input.strain}
        - Woche in Blüte: ${input.weekInFlower}
        ${input.trichomeColor ? `- Trichome-Farbe: ${input.trichomeColor}` : ''}
        ${input.pistilColor ? `- Pistil-Farbe: ${input.pistilColor}` : ''}

        Antworte im JSON-Format:
        {
          "readyToHarvest": true/false,
          "recommendation": "Detaillierte Empfehlung",
          "estimatedDaysRemaining": 14,
          "trichomeAnalysis": "Analyse der Trichome"
        }
      `;

      const messages: any[] = [
        { role: 'system', content: SYSTEM_PROMPTS.ADVISOR },
        {
          role: 'user',
          content: input.images ? [
            { type: 'text', text: prompt },
            ...input.images.map(img => ({
              type: 'image_url',
              image_url: { url: img, detail: 'high' }
            }))
          ] : prompt
        }
      ];

      const response = await openai.chat.completions.create({
        model: MODELS.GPT4O,
        messages,
        response_format: { type: 'json_object' },
        max_tokens: 1500,
        temperature: 0.4
      });

      const content = response.choices[0].message.content || '{}';

      try {
        const parsed = JSON.parse(content);
        return {
          readyToHarvest: !!parsed.readyToHarvest,
          recommendation: String(parsed.recommendation || ''),
          estimatedDaysRemaining: typeof parsed.estimatedDaysRemaining === 'number'
            ? parsed.estimatedDaysRemaining
            : undefined,
          trichomeAnalysis: parsed.trichomeAnalysis ? String(parsed.trichomeAnalysis) : undefined
        };
      } catch {
        return {
          readyToHarvest: false,
          recommendation: content,
          estimatedDaysRemaining: undefined
        };
      }

    } catch (error) {
      logger.error('[Advisor] Harvest advice failed:', error);
      throw error;
    }
  }

  /**
   * Validate AdvisorResult
   */
  private validateAdvisorResult(parsed: any): AdvisorResult {
    return {
      strainRecommendations: Array.isArray(parsed.strainRecommendations)
        ? parsed.strainRecommendations.map((s: any) => ({
            name: String(s.name || ''),
            genetics: String(s.genetics || ''),
            thc: String(s.thc || ''),
            flowering: String(s.flowering || ''),
            difficulty: String(s.difficulty || ''),
            reason: String(s.reason || '')
          }))
        : [],
      setupAdvice: Array.isArray(parsed.setupAdvice)
        ? parsed.setupAdvice.map(String)
        : [],
      timeline: Array.isArray(parsed.timeline)
        ? parsed.timeline.map((t: any) => ({
            week: typeof t.week === 'number' ? t.week : 0,
            phase: String(t.phase || ''),
            tasks: Array.isArray(t.tasks) ? t.tasks.map(String) : []
          }))
        : [],
      tips: Array.isArray(parsed.tips)
        ? parsed.tips.map(String)
        : []
    };
  }

  /**
   * Context-Prompt erstellen
   */
  private buildContextPrompt(input: AdvisorInput): string {
    if (!input.userContext) return '';

    let context = 'User-Kontext:\n';
    const ctx = input.userContext;

    if (ctx.experienceLevel) {
      context += `- Erfahrung: ${ctx.experienceLevel}\n`;
    }
    if (ctx.growType) {
      context += `- Grow-Typ: ${ctx.growType}\n`;
    }
    if (ctx.budget) {
      context += `- Budget: ${ctx.budget}\n`;
    }
    if (ctx.goals && ctx.goals.length > 0) {
      context += `- Ziele: ${ctx.goals.join(', ')}\n`;
    }
    if (ctx.equipment && ctx.equipment.length > 0) {
      context += `- Equipment: ${ctx.equipment.join(', ')}\n`;
    }

    return context;
  }
}

export const advisorService = new AdvisorService();
