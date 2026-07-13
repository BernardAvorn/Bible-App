import { Routes } from '@angular/router';

/**
 * Only two real destinations by design (Home + Bible reader) — see brief:
 * "Keep the application lightweight." Both are lazy-loaded standalone
 * components so the initial bundle stays small.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
    title: 'Avorn Bible — A Luxury Reading Experience',
  },
  {
    path: 'bible',
    loadComponent: () => import('./features/bible/bible.component').then((m) => m.BibleComponent),
    title: 'Avorn Bible — Read',
  },
  { path: '**', redirectTo: '' },
];
