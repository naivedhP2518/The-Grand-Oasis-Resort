import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { HotelService, Villa, Booking } from '../../services/hotel';

@Component({
  selector: 'app-employee-dashboard',
  standalone: false,
  templateUrl: './employee-dashboard.html',
  styleUrl: './employee-dashboard.css',
})
export class EmployeeDashboard implements OnInit {
  username: string = '';
  activeTab = signal<'dashboard' | 'villas' | 'reservations' | 'staff' | 'settings'>('dashboard');
  
  // Data Signals
  villas = signal<Villa[]>([]);
  bookings = signal<Booking[]>([]);
  employees = signal<any[]>([]);
  stats = signal<any>(null);
  loading = signal(false);

  // Search Signals
  villasSearch = signal('');
  bookingsSearch = signal('');
  staffSearch = signal('');

  // Computed Lists
  filteredVillas = computed(() => {
    const search = this.villasSearch().toLowerCase();
    return this.villas().filter(v => 
      v.number.toLowerCase().includes(search) || 
      v.category.toLowerCase().includes(search)
    );
  });

  filteredBookings = computed(() => {
    const search = this.bookingsSearch().toLowerCase();
    return this.bookings().filter(b => 
      b.guestName?.toLowerCase().includes(search) || 
      b.villaName.toLowerCase().includes(search)
    );
  });

  filteredStaff = computed(() => {
    const search = this.staffSearch().toLowerCase();
    return this.employees().filter(e => 
      e.username.toLowerCase().includes(search)
    );
  });

  constructor(
    private authService: AuthService, 
    private hotelService: HotelService,
    private router: Router
  ) {}

  ngOnInit() {
    this.username = this.authService.getUsername();
    if (!this.username) {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        this.router.navigate(['/login']);
        return;
      }
    }
    this.refreshData();
  }

  refreshData() {
    this.loading.set(true);
    // Fetch all necessary data for the dashboard
    this.hotelService.getVillas().subscribe(v => this.villas.set(v));
    this.hotelService.getAdminStats().subscribe(s => this.stats.set(s));
    this.hotelService.getAllBookings().subscribe(b => this.bookings.set(b));
    this.authService.getEmployees().subscribe(e => this.employees.set(e));
    
    setTimeout(() => this.loading.set(false), 500);
  }

  setTab(tab: 'dashboard' | 'villas' | 'reservations' | 'staff' | 'settings') {
    this.activeTab.set(tab);
  }

  updateVillaStatus(id: number, status: string) {
    const villa = this.villas().find(v => v.id === id);
    if (!villa) return;
    
    const updatedVilla = { ...villa, status };
    this.hotelService.updateVilla(id, updatedVilla).subscribe(() => {
      this.refreshData();
    });
  }

  deleteBooking(id: string) {
    if (confirm('Are you sure you want to delete this reservation?')) {
      this.hotelService.adminDeleteBooking(id).subscribe(() => {
        this.refreshData();
      });
    }
  }

  updateBookingStatus(id: string, status: string) {
    this.hotelService.adminUpdateBooking(id, { status }).subscribe(() => {
      this.refreshData();
    });
  }

  getStatusClass(status?: string) {
    switch (status) {
      case 'Available': return 'status-available';
      case 'Booked': return 'status-booked';
      case 'Confirmed': return 'status-confirmed';
      case 'Cancelled': return 'status-cancelled';
      case 'Maintenance': return 'status-maintenance';
      default: return 'status-default';
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
