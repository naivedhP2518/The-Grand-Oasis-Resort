import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Villa {
  id: number;
  category: string;
  number: string;
  type: string;
  price: number;
  status: string;
  row: string;
  col: number;
}

export interface Booking {
  id?: string;
  _id?: string;
  villaId: number;
  villaName: string;
  guestName?: string;
  email?: string;
  phone?: string;
  address?: string;
  idProofUrl?: string;
  checkIn: string;
  checkOut: string;
  status?: string;
  totalPrice: number;
}

@Injectable({
  providedIn: 'root'
})
export class HotelService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) {}

  getVillas(): Observable<Villa[]> {
    return this.http.get<Villa[]>(`${this.apiUrl}/villas`);
  }

  createBooking(booking: Booking): Observable<any> {
    const token = localStorage.getItem('auth_token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post(`${this.apiUrl}/bookings`, booking, { headers });
  }

  getMyBookings(): Observable<Booking[]> {
    const token = localStorage.getItem('auth_token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<Booking[]>(`${this.apiUrl}/my-bookings`, { headers });
  }

  private getAdminHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    const masterPassword = sessionStorage.getItem('admin_master_password');
    let headers = new HttpHeaders();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    if (masterPassword) headers = headers.set('X-Admin-Password', masterPassword);
    return headers;
  }

  cancelBooking(id: number | string): Observable<any> {
    const token = localStorage.getItem('auth_token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.put(`${this.apiUrl}/bookings/${id}/cancel`, {}, { headers });
  }

  // --- ADMIN METHODS ---

  getAdminStats(): Observable<any> {
    const headers = this.getAdminHeaders();
    return this.http.get(`${this.apiUrl}/admin/stats`, { headers });
  }

  getAllBookings(): Observable<Booking[]> {
    const headers = this.getAdminHeaders();
    return this.http.get<Booking[]>(`${this.apiUrl}/admin/all-bookings`, { headers });
  }

  addVilla(villa: any): Observable<any> {
    const headers = this.getAdminHeaders();
    return this.http.post(`${this.apiUrl}/villas`, villa, { headers });
  }

  updateVilla(id: number, villa: any): Observable<any> {
    const headers = this.getAdminHeaders();
    return this.http.put(`${this.apiUrl}/villas/${id}`, villa, { headers });
  }

  deleteVilla(id: number): Observable<any> {
    const headers = this.getAdminHeaders();
    return this.http.delete(`${this.apiUrl}/villas/${id}`, { headers });
  }

  adminUpdateBooking(id: string, data: any): Observable<any> {
    const headers = this.getAdminHeaders();
    return this.http.put(`${this.apiUrl}/admin/bookings/${id}`, data, { headers });
  }

  adminDeleteBooking(id: string): Observable<any> {
    const headers = this.getAdminHeaders();
    return this.http.delete(`${this.apiUrl}/admin/bookings/${id}`, { headers });
  }
}
