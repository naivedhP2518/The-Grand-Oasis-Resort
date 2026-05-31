import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = '/api';
  
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private userRoleSubject = new BehaviorSubject<'customer' | 'management' | 'admin'>('customer');
  public userRole$ = this.userRoleSubject.asObservable();

  constructor(private http: HttpClient) {
    this.restoreSession();
  }

  private restoreSession() {
    const token = localStorage.getItem('auth_token');
    if (token) {
      const payload = this.decodeToken(token);
      if (payload) {
        this.currentUserSubject.next({ identifier: payload.identifier, role: payload.role });
        this.userRoleSubject.next(payload.role || 'customer');
      }
    }
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData).pipe(
      tap((res: any) => {
        if (res.token) {
          this.handleAuthSuccess(res.token, res.user);
        }
      })
    );
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((res: any) => {
        if (res.token) {
          this.handleAuthSuccess(res.token, res.user);
        }
      })
    );
  }

  managementLogin(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/management-login`, credentials).pipe(
      tap((res: any) => {
        if (res.token) {
          this.handleAuthSuccess(res.token, res.user);
        }
      })
    );
  }

  private handleAuthSuccess(token: string, user: any) {
    localStorage.setItem('auth_token', token);
    this.currentUserSubject.next(user);
    this.userRoleSubject.next(user.role || 'customer');
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    this.currentUserSubject.next(null);
    this.userRoleSubject.next('customer');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  getRole(): 'customer' | 'management' | 'admin' {
    return this.userRoleSubject.value;
  }

  decodeToken(token: string): any {
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

  // --- Restored Legacy / Additional Methods ---
  
  isAdmin(): boolean {
    return this.userRoleSubject.value === 'admin';
  }

  verifyAdminPassword(password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/verify-password`, { password });
  }

  getUsername(): string {
    return this.currentUserSubject.value?.identifier || this.currentUserSubject.value?.email || '';
  }

  getEmail(): string {
    return this.getUsername();
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

  // --- Legacy OTP Methods ---
  
  sendCode(email?: string, phone?: string, role: string = 'customer'): Observable<any> {
    return this.http.post(`${this.apiUrl}/send-code`, { email, phone, role });
  }

  verifyCode(code: string, email?: string, phone?: string, role: string = 'customer'): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-code`, { email, phone, code: parseInt(code), role }).pipe(
      tap((res: any) => {
        if (res.token) {
           const payload = this.decodeToken(res.token);
           this.handleAuthSuccess(res.token, { identifier: payload.identifier, role: payload.role });
        }
      })
    );
  }

  private getAdminHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    const masterPassword = sessionStorage.getItem('admin_master_password');
    let headers = new HttpHeaders();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    if (masterPassword) headers = headers.set('X-Admin-Password', masterPassword);
    return headers;
  }

  getAllUsers(): Observable<any[]> {
    const headers = this.getAdminHeaders();
    return this.http.get<any[]>(`${this.apiUrl}/admin/users`, { headers });
  }

  updateUserRole(id: string, role: string): Observable<any> {
    const headers = this.getAdminHeaders();
    return this.http.put(`${this.apiUrl}/admin/users/${id}/role`, { role }, { headers });
  }

  deleteUser(id: string): Observable<any> {
    const headers = this.getAdminHeaders();
    return this.http.delete(`${this.apiUrl}/admin/users/${id}`, { headers });
  }
}
