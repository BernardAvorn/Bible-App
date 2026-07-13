import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Preload all lazy-loaded feature routes in the background after the
    // initial render, so navigating to the Bible page feels instant.
    provideRouter(routes, withPreloading(PreloadAllModules)),
    // withFetch swaps the underlying transport to the native Fetch API,
    // which plays nicer with SSR/hydration and modern build targets.
    provideHttpClient(withFetch()),
  ]
};
