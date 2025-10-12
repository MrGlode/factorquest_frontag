import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptors';
import { ApimAuthService } from './services/apim-auth.service';

export function initializeApimToken(apimAuthService: ApimAuthService) {
  return () => {
    console.log('🚀 Initialisation de l\'application - Obtention du token API Manager...');
    return apimAuthService.getToken().toPromise().then(
      token => {
        console.log('✅ Token API Manager initialisé avec succès');
        return token;
      },
      error => {
        console.error('❌ Échec de l\'initialisation du token API Manager:', error);
        return null;
      }
    );
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    {
      provide: 'APP_INITIALIZER',
      useFactory: initializeApimToken,
      deps: [ApimAuthService],
      multi: true
    }
  ]
};