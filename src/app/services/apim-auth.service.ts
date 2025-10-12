import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable, BehaviorSubject, throwError, of } from "rxjs";
import { tap, catchError, switchMap } from "rxjs/operators";
import { environment } from "../../environments/environment";

interface ApimTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
}

@Injectable({
    providedIn: "root"
})
export class ApimAuthService {
    private tokenSubject = new BehaviorSubject<string | null>(null);
    private tokenExpiryTime: number = 0;
    private refreshTokenTimeout: any;

    constructor(private http: HttpClient) {
        const storedToken = localStorage.getItem("apim_token");
        const storedExpiry = localStorage.getItem("apim_token_expiry");

        if (storedToken && storedExpiry) {
            const expiryTime = parseInt(storedExpiry, 10);
            if (expiryTime > Date.now()) {
                this.tokenSubject.next(storedToken);
                this.tokenExpiryTime = expiryTime;
                this.scheduleTokenRefresh(expiryTime);
            } else {
                this.clearToken();
            }
        }
    }

    public getToken(): Observable<string> {
        const currentToken = this.tokenSubject.value;

        if (currentToken && this.tokenExpiryTime > Date.now()) {
            return of(currentToken);
        }

        return this.fetchNewToken();
    }

    public refreshToken(): Observable<string> {
        return this.fetchNewToken();
    }

    public hasValidToken(): boolean {
        return !!this.tokenSubject.value && this.tokenExpiryTime > Date.now();
    }

    public getCurrentToken(): string | null {
        return this.tokenSubject.value;
    }

    private fetchNewToken(): Observable<string> {
        console.log("Fetching new APIM token...");

        const credentials = btoa(`${environment.clientId}:${environment.clientSecret}`);

        const headers = new HttpHeaders({
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${credentials}`,
        });

        const body = new URLSearchParams({
            'grant_type': environment.grantType,
        }).toString();

        return this.http.post<ApimTokenResponse>(
            environment.authUrl,
            body,
            { headers }
        ).pipe(
            tap(response => {
               console.log("APIM token fetched successfully.");
               this.storeToken(response);
           }),
            switchMap(response => of(response.access_token)),
            catchError(error => {
                console.error("Error fetching APIM token:", error);
                return throwError(() => new Error("Failed to fetch APIM token"));
            })
        );
    }

    private storeToken(response: ApimTokenResponse): void {
        const token = response.access_token;
        const expiresIn = response.expires_in;
        const expiryTime = Date.now() + (expiresIn * 1000);

        localStorage.setItem("apim_token", token);
        localStorage.setItem("apim_token_expiry", expiryTime.toString());

        this.tokenSubject.next(token);
        this.tokenExpiryTime = expiryTime;

        this.scheduleTokenRefresh(expiryTime);
        console.log("APIM token stored and refresh scheduled.");
    }

    private scheduleTokenRefresh(expiryTime: number): void {
        if (this.refreshTokenTimeout) {
            clearTimeout(this.refreshTokenTimeout);
        }

        const refreshTime = expiryTime - Date.now() - (5 * 60 * 1000); // 5 minutes before expiry

        if (refreshTime > 0) {
            console.log(`Scheduling token refresh in ${Math.round(refreshTime / 1000)} seconds.`);

            this.refreshTokenTimeout = setTimeout(() => {
                console.log("Refreshing APIM token...");
                this.fetchNewToken().subscribe({
                    error: err => console.error("Error refreshing APIM token:", err)
                });
            }, refreshTime);
        }
    }

    private clearToken(): void {
        localStorage.removeItem("apim_token");
        localStorage.removeItem("apim_token_expiry");
        this.tokenSubject.next(null);
        this.tokenExpiryTime = 0;
        if (this.refreshTokenTimeout) {
            clearTimeout(this.refreshTokenTimeout);
        }
        console.log("APIM token cleared.");
    }

    public getTokenObservable(): Observable<string | null> {
        return this.tokenSubject.asObservable();
    }
}