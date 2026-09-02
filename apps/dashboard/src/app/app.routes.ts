import { Route } from '@angular/router';
import { LayoutComponent } from './layout/layout';
import { SignalTableComponent } from './signals/signal-table/signal-table';
import { NewsPanelComponent } from './signals/news-panel/news-panel';

export const appRoutes: Route[] = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'signals', component: SignalTableComponent },
      { path: 'news', component: NewsPanelComponent },
      { path: '', redirectTo: 'signals', pathMatch: 'full' },
    ],
  },
];
