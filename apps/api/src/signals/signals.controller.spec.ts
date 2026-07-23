import { NotFoundException } from '@nestjs/common';
import { SignalsController } from './signals.controller';
import { SignalsService } from './signals.service';

describe('SignalsController', () => {
  let controller: SignalsController;
  let service: SignalsService;

  beforeEach(() => {
    service = new SignalsService();
    controller = new SignalsController(service);
  });

  describe('findAll', () => {
    it('should return all signals', () => {
      const result = controller.findAll();
      expect(result).toEqual(service.findAll());
      expect(result.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('findOne', () => {
    it('should return a signal by id', () => {
      const result = controller.findOne('1');
      expect(result.id).toBe('1');
    });

    it('should throw NotFoundException for unknown id', () => {
      expect(() => controller.findOne('nonexistent')).toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create and return a new signal', () => {
      const input = {
        asset: 'GOOG',
        assetClass: 'equity' as const,
        direction: 'SELL' as const,
        confidence: 65,
      };
      const result = controller.create(input);
      expect(result.asset).toBe('GOOG');
      expect(result.direction).toBe('SELL');
      expect(result.id).toBeDefined();
    });
  });
});
