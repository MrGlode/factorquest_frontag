import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ApimAuthService } from '../services/apim-auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const apimAuthService = inject(ApimAuthService);
  const router = inject(Router);

  if(req.url.includes('oauth2/token')) {
    return next(req);
  }

  return apimAuthService.getToken().pipe(
    switchMap(apimToken => {
      let authReq = req;

      if (apimToken) {
        authReq = authReq.clone({
          setHeaders: {
            Authorization: `Bearer ${apimToken}`
          }
        });
      }
      
      const publicEndpoints = ['/auth/login', '/auth/register', '/auth/password-reset'];
      const isPublicEndpoint = publicEndpoints.some(endpoint => req.url.includes(endpoint));

      if (!isPublicEndpoint) {
        const userToken = authService.getAccessToken();
        if (userToken) {
          authReq = authReq.clone({
            setHeaders: {
              'AppAuth': userToken
            }
          });
        }
      }

      return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401) {
            if (error.url?.includes(req.url)) {
              console.warn('Token api manager expiré, rafraîchissement du token...');
              authService.logout();
            }
          }
          if (error.status === 403) {
            console.warn('Accès refusé - redirection vers la page d\'accueil');
            router.navigate(['/dashboard']);
          }
          return throwError(() => error);
        })
      );
    }),
    catchError((error) => {
      console.error('Erreur lors de la récupération du token APIM', error);
      return throwError(() => error);
    })
  );
};