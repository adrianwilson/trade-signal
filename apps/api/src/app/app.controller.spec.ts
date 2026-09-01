import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    controller = module.get<AppController>(AppController);
    service = module.get<AppService>(AppService);
  });

  describe('getData', () => {
    it('should return message', () => {
      expect(controller.getData()).toEqual({ message: 'Hello API' });
    });
  });

  describe('getHealth', () => {
    it('should return health status', () => {
      const result = controller.getHealth();
      expect(result.status).toBe('ok');
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });
});

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  describe('getHealth', () => {
    it('should return status ok', () => {
      const result = service.getHealth();
      expect(result.status).toBe('ok');
    });

    it('should return uptime as a number', () => {
      const result = service.getHealth();
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return a valid ISO timestamp', () => {
      const result = service.getHealth();
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });
});
