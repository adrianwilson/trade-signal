import { EventsGateway } from './events.gateway';

describe('EventsGateway', () => {
  let gateway: EventsGateway;
  let mockServer: { emit: jest.Mock };

  beforeEach(() => {
    gateway = new EventsGateway();
    mockServer = { emit: jest.fn() };
    gateway.server = mockServer as any;
  });

  describe('lifecycle', () => {
    it('should track connected clients', () => {
      expect(gateway.getConnectedClients()).toBe(0);
      gateway.handleConnection({ id: 'c1' } as any);
      expect(gateway.getConnectedClients()).toBe(1);
      gateway.handleDisconnect({ id: 'c1' } as any);
      expect(gateway.getConnectedClients()).toBe(0);
    });
  });

  describe('emitSignalCreated', () => {
    it('should emit signal:created event', () => {
      gateway.emitSignalCreated({ asset: 'AAPL', direction: 'BUY' });
      expect(mockServer.emit).toHaveBeenCalledWith('signal:created', {
        asset: 'AAPL',
        direction: 'BUY',
      });
    });
  });

  describe('emitPriceUpdate', () => {
    it('should emit price:update event', () => {
      gateway.emitPriceUpdate('AAPL', 150, 1.5);
      expect(mockServer.emit).toHaveBeenCalledWith('price:update', {
        asset: 'AAPL',
        price: 150,
        changePercent: 1.5,
      });
    });
  });

  describe('emitSynthesisUpdate', () => {
    it('should emit synthesis:update event', () => {
      gateway.emitSynthesisUpdate({ asset: 'AAPL', direction: 'BUY' });
      expect(mockServer.emit).toHaveBeenCalledWith('synthesis:update', {
        asset: 'AAPL',
        direction: 'BUY',
      });
    });
  });

  describe('emitAlertCreated', () => {
    it('should emit alert:created event', () => {
      gateway.emitAlertCreated({ asset: 'AAPL', message: 'test' });
      expect(mockServer.emit).toHaveBeenCalledWith('alert:created', {
        asset: 'AAPL',
        message: 'test',
      });
    });
  });
});
