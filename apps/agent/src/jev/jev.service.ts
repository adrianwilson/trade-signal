import { Injectable, Logger } from '@nestjs/common';

const JEV_API_URL = 'https://api.typesafe.ai/v1/systemone';

export interface JevChoiceQuestion {
  type: 'choice';
  instructions: string;
  criteria: Record<string, string>;
}

export interface JevScoreQuestion {
  type: 'score';
  instructions: string;
  criteria: string[];
}

export interface JevNoulQuestion {
  type: 'noul';
  instructions: string;
}

export type JevQuestion = JevChoiceQuestion | JevScoreQuestion | JevNoulQuestion;

export interface JevAnswer {
  type: string;
  choice?: string;
  score?: number;
  noul?: boolean;
  confidence: number;
}

export function choice(
  instructions: string,
  criteria: Record<string, string>,
): JevChoiceQuestion {
  return { type: 'choice', instructions, criteria };
}

export function score(
  instructions: string,
  criteria: string[],
): JevScoreQuestion {
  return { type: 'score', instructions, criteria };
}

export function noul(instructions: string): JevNoulQuestion {
  return { type: 'noul', instructions };
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
