import { Route } from '@angular/router';
import { LayoutComponent } from './layout/layout';
import { SignalTableComponent } from './signals/signal-table/signal-table';
import { NewsPanelComponent } from './signals/news-panel/news-panel';
import { SynthesisViewComponent } from './signals/synthesis-view/synthesis-view';
import { LoginComponent } from './auth/login/login';
import { WatchlistComponent } from './signals/watchlist/watchlist';

export const appRoutes: Route[] = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'synthesis', component: SynthesisViewComponent },
      { path: 'watchlist', component: WatchlistComponent },
      { path: 'signals', component: SignalTableComponent },
      { path: 'news', component: NewsPanelComponent },
      { path: '', redirectTo: 'synthesis', pathMatch: 'full' },
    ],
  },
];
