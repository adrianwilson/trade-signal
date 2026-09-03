import { describe, it, expect, beforeEach } from 'vitest';
import { WebSocketService } from './websocket.service';

describe('WebSocketService', () => {
  let service: WebSocketService;

  beforeEach(() => {
    service = new WebSocketService();
  });

  it('should start disconnected', () => {
    expect(service.connected()).toBe(false);
  });

  it('should have empty live prices', () => {
    expect(service.livePrices().size).toBe(0);
  });

  it('should have null latest signals', () => {
    expect(service.latestSignal()).toBeNull();
    expect(service.latestSynthesis()).toBeNull();
    expect(service.latestAlert()).toBeNull();
  });

  it('should disconnect cleanly', () => {
    service.disconnect();
    expect(service.connected()).toBe(false);
  });
});
