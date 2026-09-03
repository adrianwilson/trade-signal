import { Injectable, signal, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';

export interface PriceUpdate {
  asset: string;
  price: number;
  changePercent: number;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private socket: Socket | null = null;

  readonly connected = signal(false);
  readonly livePrices = signal<Map<string, PriceUpdate>>(new Map());
  readonly latestSignal = signal<Record<string, unknown> | null>(null);
  readonly latestSynthesis = signal<Record<string, unknown> | null>(null);
  readonly latestAlert = signal<Record<string, unknown> | null>(null);

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io('http://localhost:3000', {
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      this.connected.set(true);
    });

    this.socket.on('disconnect', () => {
      this.connected.set(false);
    });

    this.socket.on('price:update', (data: PriceUpdate) => {
      this.livePrices.update((map) => {
        const updated = new Map(map);
        updated.set(data.asset, data);
        return updated;
      });
    });

    this.socket.on('signal:created', (data: Record<string, unknown>) => {
      this.latestSignal.set(data);
    });

    this.socket.on('synthesis:update', (data: Record<string, unknown>) => {
      this.latestSynthesis.set(data);
    });

    this.socket.on('alert:created', (data: Record<string, unknown>) => {
      this.latestAlert.set(data);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.connected.set(false);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
