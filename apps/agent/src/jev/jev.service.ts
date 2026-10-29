import { Injectable, Logger } from '@nestjs/common';

const JEV_API_URL = 'https://api.typesafe.ai/v1/system-one';

export interface JevChoice {
  type: 'choice';
  question: string;
  options: string[];
}

export interface JevScore {
  type: 'score';
  question: string;
  scale: string;
}

export interface JevNoul {
  type: 'noul';
  question: string;
}

export type JevQuestion = JevChoice | JevScore | JevNoul;

export interface JevAnswer {
  value: string | number | boolean;
  confidence: number;
}

export function choice(question: string, options: string[]): JevChoice {
  return { type: 'choice', question, options };
}

export function score(question: string, scale: string): JevScore {
  return { type: 'score', question, scale };
}

export function noul(question: string): JevNoul {
  return { type: 'noul', question };
}

@Injectable()
export class JevService {
  private readonly logger = new Logger(JevService.name);
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env['TYPESAFE_API_KEY'] || '';
    if (!this.apiKey) {
      this.logger.warn('TYPESAFE_API_KEY not set — Jev gates disabled');
    }
  }

  async decide(
    state: string,
    questions: Record<string, JevQuestion>,
  ): Promise<Record<string, JevAnswer> | null> {
    if (!this.apiKey) return null;

    try {
      const response = await fetch(JEV_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'jev-latest',
          state,
          questions,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        this.logger.warn(`Jev returned ${response.status}`);
        return null;
      }

      const result = (await response.json()) as {
        answers?: Record<string, JevAnswer>;
      };
      return result.answers ?? null;
    } catch (err) {
      this.logger.warn(`Jev call failed: ${err}`);
      return null;
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }
}
