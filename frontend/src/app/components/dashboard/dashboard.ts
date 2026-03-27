import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { HotelService, Booking } from '../../services/hotel';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  bookings: Booking[] = [];
  loading: boolean = false;

  selectedBooking: Booking | null = null;
  showDetails: boolean = false;
  
  cancellingBooking: Booking | null = null;
  showCancelConfirm: boolean = false;

  constructor(
    private authService: AuthService, 
    private hotelService: HotelService,
    private router: Router
  ) {}

  ngOnInit() {
    console.log('Dashboard: Fetching my bookings...');
    this.hotelService.getMyBookings().subscribe({
      next: (data) => {
        console.log(`✅ [DASHBOARD] Successfully received ${data?.length || 0} reservations from backend.`);
        this.bookings = data || [];
      },
      error: (err) => {
        console.error('Error fetching bookings:', err);
        if (err.status === 401) {
          this.authService.logout();
          this.router.navigate(['/login']);
        }
        this.bookings = [];
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/home']);
  }

  onCancelBooking(id: any) {
    this.cancellingBooking = this.bookings.find(b => b._id === id) || null;
    if (this.cancellingBooking) {
      this.showCancelConfirm = true;
    }
  }

  confirmCancel() {
    if (!this.cancellingBooking) return;
    
    const id = this.cancellingBooking._id;
    const villaName = this.cancellingBooking.villaName;

    this.hotelService.cancelBooking(id!).subscribe({
      next: () => {
        alert(`Reservation for ${villaName} cancelled. Your Money will be returned in 7 to 14 days.`);
        this.showCancelConfirm = false;
        this.cancellingBooking = null;
        this.ngOnInit(); // Refresh
      },
      error: (err) => {
        alert(err.error?.message || 'Cancellation failed.');
      }
    });
  }

  closeCancel() {
    this.showCancelConfirm = false;
    this.cancellingBooking = null;
  }
  
  viewDetails(booking: Booking) {
    this.selectedBooking = booking;
    this.showDetails = true;
  }

  closeDetails() {
    this.showDetails = false;
    this.selectedBooking = null;
  }
}
