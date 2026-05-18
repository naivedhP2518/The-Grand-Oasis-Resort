import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Villa {
  id: number;
  category: string;
  number: string;
  type: string;
  price: number;
  maxCapacity: number;
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
  guests: number;
  email?: string;
  phone?: string;
  address?: string;
  idProofUrl?: string;
  checkIn: string;
  checkOut: string;
  status?: string;
  refundStatus?: string;
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

  checkAvailability(checkIn: string, checkOut: string, guests: number): Observable<Villa[]> {
    return this.http.get<Villa[]>(`${this.apiUrl}/villas/availability?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`);
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

  processPayment(bookingId: string, paymentMethod: string, amount: number): Observable<any> {
    const token = localStorage.getItem('auth_token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post(`${this.apiUrl}/bookings/${bookingId}/pay`, { paymentMethod, amount }, { headers });
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

  getAdminAnalytics(): Observable<any> {
    const headers = this.getAdminHeaders();
    return this.http.get(`${this.apiUrl}/admin/analytics`, { headers });
  }

  getNotifications(): Observable<any[]> {
    const headers = this.getAdminHeaders();
    return this.http.get<any[]>(`${this.apiUrl}/admin/notifications`, { headers });
  }

  markNotificationRead(id: string): Observable<any> {
    const headers = this.getAdminHeaders();
    return this.http.put(`${this.apiUrl}/admin/notifications/${id}/read`, {}, { headers });
  }

  markAllNotificationsRead(): Observable<any> {
    const headers = this.getAdminHeaders();
    return this.http.put(`${this.apiUrl}/admin/notifications/mark-all-read`, {}, { headers });
  }
}
