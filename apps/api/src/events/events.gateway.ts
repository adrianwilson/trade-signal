import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: 'http://localhost:4200' },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private connectedClients = 0;

  afterInit(): void {
    this.logger.log('WebSocket gateway initialized');
  }

  handleConnection(client: Socket): void {
    this.connectedClients++;
    this.logger.log(
      `Client connected: ${client.id} (${this.connectedClients} total)`,
    );
  }

  handleDisconnect(client: Socket): void {
    this.connectedClients--;
    this.logger.log(
      `Client disconnected: ${client.id} (${this.connectedClients} total)`,
    );
  }

  emitSignalCreated(signal: Record<string, unknown>): void {
    this.server?.emit('signal:created', signal);
  }

  emitPriceUpdate(asset: string, price: number, changePercent: number): void {
    this.server?.emit('price:update', { asset, price, changePercent });
  }

  emitSynthesisUpdate(synthesis: Record<string, unknown>): void {
    this.server?.emit('synthesis:update', synthesis);
  }

  emitAlertCreated(alert: Record<string, unknown>): void {
    this.server?.emit('alert:created', alert);
  }

  getConnectedClients(): number {
    return this.connectedClients;
  }
}
