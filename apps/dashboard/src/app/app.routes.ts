import { Route } from '@angular/router';
import { LayoutComponent } from './layout/layout';
import { SignalTableComponent } from './signals/signal-table/signal-table';

export const appRoutes: Route[] = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'signals', component: SignalTableComponent },
      { path: '', redirectTo: 'signals', pathMatch: 'full' },
    ],
  },
];
