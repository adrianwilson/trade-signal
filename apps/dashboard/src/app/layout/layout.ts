import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { DatePipe, CurrencyPipe, DecimalPipe } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { SignalService, AlertItem } from '../services/signal.service';
import { WebSocketService } from '../services/websocket.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatMenuModule,
    DatePipe,
    CurrencyPipe,
    DecimalPipe,
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class LayoutComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly wsService = inject(WebSocketService);
  private readonly signalService = inject(SignalService);

  unreadCount = signal(0);
  alerts = signal<AlertItem[]>([]);

  ngOnInit(): void {
    this.wsService.connect();
    if (this.authService.isAuthenticated()) {
      this.loadAlerts();
    }
  }

  loadAlerts(): void {
    this.signalService.generateAlerts().subscribe();
    this.signalService.getAlerts().subscribe({
      next: (data) => this.alerts.set(data.slice(0, 10)),
    });
    this.signalService.getUnreadAlertCount().subscribe({
      next: (count) => this.unreadCount.set(count),
    });
  }

  markAllRead(): void {
    this.signalService.markAllAlertsAsRead().subscribe({
      next: () => {
        this.unreadCount.set(0);
        this.alerts.update((list) => list.map((a) => ({ ...a, read: true })));
      },
    });
  }

  directionColor(direction: string): string {
    switch (direction) {
      case 'BUY':
        return '#4caf50';
      case 'SELL':
        return '#f44336';
      default:
        return '#ff9800';
    }
  }
}
