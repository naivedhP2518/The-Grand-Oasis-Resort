import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, timeout } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = '/api';
  private userEmail: string = '';

  constructor(private http: HttpClient) {}

  sendCode(email: string): Observable<any> {
    console.log('Sending code to:', email);
    this.userEmail = email;
    return this.http.post(`${this.apiUrl}/send-code`, { email }).pipe(
      tap({
        next: (res) => console.log('Send code success:', res),
        error: (err) => console.error('Send code error:', err)
      })
    );
  }

  verifyCode(code: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-code`, { 
      email: this.userEmail, 
      code: parseInt(code) 
    }).pipe(
      tap((res: any) => {
        if (res.token) {
          localStorage.setItem('auth_token', res.token);
          const payload = this.decodeToken(res.token);
          if (payload?.email) this.userEmail = payload.email;
        }
      })
    );
  }

  private decodeToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  isAdmin(): boolean {
    return sessionStorage.getItem('admin_master_password') === 'GOD';
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  logout(): void {
    localStorage.removeItem('auth_token');
  }

  getEmail(): string {
    if (!this.userEmail) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        const payload = this.decodeToken(token);
        this.userEmail = payload?.email || '';
      }
    }
    return this.userEmail;
  }
}
