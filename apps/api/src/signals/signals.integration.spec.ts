import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { ManualSignalInput, Signal } from '@org/signals';
import { AppModule } from '../app/app.module';

const ASSET_CLASSES: Signal['assetClass'][] = [
  'equity',
  'crypto',
  'forex',
  'options',
];
const DIRECTIONS: Signal['direction'][] = ['BUY', 'SELL', 'HOLD'];
const SOURCES: Signal['source'][] = [
  'manual',
  'rsi',
  'macd',
  'news-sentiment',
  'volume',
  'agent',
];

/**
 * Central acceptance check that a response body conforms to the shared
 * `Signal` type from `@org/signals`. `reasoning` and `metadata` are optional.
 */
function expectValidSignal(body: unknown): void {
  expect(typeof body).toBe('object');
  expect(body).not.toBeNull();

  const signal = body as Record<string, unknown>;

  expect(typeof signal['id']).toBe('string');
  expect((signal['id'] as string).length).toBeGreaterThan(0);

  expect(typeof signal['asset']).toBe('string');
  expect(ASSET_CLASSES).toContain(signal['assetClass']);
  expect(DIRECTIONS).toContain(signal['direction']);

  expect(typeof signal['confidence']).toBe('number');
  expect(signal['confidence'] as number).toBeGreaterThanOrEqual(0);
  expect(signal['confidence'] as number).toBeLessThanOrEqual(100);

  expect(SOURCES).toContain(signal['source']);

  expect(typeof signal['timestamp']).toBe('string');
  expect(Number.isNaN(Date.parse(signal['timestamp'] as string))).toBe(false);
}

describe('Signals API (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    // Mirror main.ts: routes are served under the global `api` prefix.
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/signals', () => {
    it('returns 200 with a JSON array of valid signals', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/signals')
        .expect(200)
        .expect('Content-Type', /application\/json/);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(6);
      for (const signal of res.body) {
        expectValidSignal(signal);
      }
    });
  });

  describe('GET /api/signals/:id', () => {
    it('returns 200 with the matching signal for a valid id', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/signals/1')
        .expect(200)
        .expect('Content-Type', /application\/json/);

      expect(res.body.id).toBe('1');
      expect(res.body.asset).toBe('AAPL');
      expectValidSignal(res.body);
    });

    it('returns 404 with a NestJS error body for an unknown id', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/signals/nonexistent')
        .expect(404)
        .expect('Content-Type', /application\/json/);

      expect(res.body.statusCode).toBe(404);
      expect(res.body.message).toBeDefined();
    });
  });

  describe('POST /api/signals', () => {
    it('returns 201 with the created signal', async () => {
      const payload: ManualSignalInput = {
        asset: 'GOOG',
        assetClass: 'equity',
        direction: 'SELL',
        confidence: 65,
        notes: 'integration test signal',
      };

      const res = await request(app.getHttpServer())
        .post('/api/signals')
        .send(payload)
        .expect(201)
        .expect('Content-Type', /application\/json/);

      expectValidSignal(res.body);
      expect(typeof res.body.id).toBe('string');
      expect(res.body.id.length).toBeGreaterThan(0);
      expect(res.body.asset).toBe('GOOG');
      expect(res.body.direction).toBe('SELL');
      expect(res.body.confidence).toBe(65);
      // The service forces `source: 'manual'` and maps `notes` -> `reasoning`.
      expect(res.body.source).toBe('manual');
      expect(res.body.reasoning).toBe('integration test signal');
      expect(Number.isNaN(Date.parse(res.body.timestamp))).toBe(false);
    });
  });
});
