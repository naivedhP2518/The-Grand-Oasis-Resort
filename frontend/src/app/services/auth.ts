import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, timeout } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = '/api';
  private userEmail: string = '';
  private userPhone: string = '';
  private userRole: 'customer' | 'management' = 'customer';
  private userName: string = '';

  constructor(private http: HttpClient) {
    // Restore state if available
    this.userEmail = sessionStorage.getItem('pending_email') || '';
    this.userPhone = sessionStorage.getItem('pending_phone') || '';
    this.userRole = (sessionStorage.getItem('pending_role') as 'customer' | 'management') || 'customer';
  }

  sendCode(email?: string, phone?: string, role: 'customer' | 'management' = 'customer'): Observable<any> {
    console.log('Sending code to:', email || phone, 'as', role);
    this.userEmail = email || '';
    this.userPhone = phone || '';
    this.userRole = role;

    // Persist pending state
    sessionStorage.setItem('pending_email', this.userEmail);
    sessionStorage.setItem('pending_phone', this.userPhone);
    sessionStorage.setItem('pending_role', this.userRole);

    return this.http.post(`${this.apiUrl}/send-code`, { email, phone, role }).pipe(
      tap({
        next: (res) => console.log('Send code success:', res),
        error: (err) => console.error('Send code error:', err)
      })
    );
  }

  verifyCode(code: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-code`, { 
      email: this.userEmail, 
      phone: this.userPhone,
      code: parseInt(code),
      role: this.userRole
    }).pipe(
      tap((res: any) => {
        if (res.token) {
          localStorage.setItem('auth_token', res.token);
          const payload = this.decodeToken(res.token);
          if (payload?.email) this.userEmail = payload.email;
          
          // Clear pending
          sessionStorage.removeItem('pending_email');
          sessionStorage.removeItem('pending_phone');
          sessionStorage.removeItem('pending_role');
        }
      })
    );
  }

  googleLogin(googleData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/google-login`, { 
      ...googleData,
      role: this.userRole 
    }).pipe(
      tap((res: any) => {
        if (res.token) {
          localStorage.setItem('auth_token', res.token);
          this.userEmail = googleData.email;
        }
      })
    );
  }

  managementLogin(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/management-login`, credentials).pipe(
      tap((res: any) => {
        if (res.token) {
          localStorage.setItem('auth_token', res.token);
          this.userRole = 'management';
          this.userName = res.user?.username || credentials.username;
        }
      })
    );
  }

  createEmployee(employeeData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/create-employee`, employeeData);
  }

  getEmployees(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/employees`);
  }
  
  deleteEmployee(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/employees/${id}`);
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
    sessionStorage.removeItem('pending_email');
    sessionStorage.removeItem('pending_phone');
    sessionStorage.removeItem('pending_role');
    sessionStorage.removeItem('admin_master_password');
  }

  getEmail(): string {
    if (!this.userEmail && !this.userPhone) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        const payload = this.decodeToken(token);
        this.userEmail = payload?.email || '';
      }
    }
    return this.userEmail || this.userPhone;
  }

  getRole(): 'customer' | 'management' {
    return this.userRole;
  }

  setRole(role: 'customer' | 'management'): void {
    this.userRole = role;
  }

  getUsername(): string {
    if (!this.userName) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        const payload = this.decodeToken(token);
        this.userName = payload?.identifier || '';
      }
    }
    return this.userName;
  }
}
