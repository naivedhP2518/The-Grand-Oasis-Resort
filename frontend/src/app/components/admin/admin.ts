import { Component, OnInit, signal } from '@angular/core';
import { HotelService, Booking, Villa } from '../../services/hotel';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.html',
  styleUrls: ['../../app.css'],
  standalone: false
})
export class Admin implements OnInit {
  stats = signal<any>(null);
  bookings = signal<Booking[]>([]);
  villas = signal<Villa[]>([]);
  activeTab = signal<'stats' | 'villas' | 'bookings'>('stats');
  
  // Auth Logic
  isLocked = signal(true);
  passwordInput = signal('');
  loginError = signal(false);
  
  // Villa Form
  villaForm: FormGroup;
  showVillaModal = signal(false);
  editingVillaId = signal<number | null>(null);

  // Booking Form
  bookingForm: FormGroup;
  showBookingModal = signal(false);
  editingBookingId = signal<string | null>(null);

  constructor(
    private hotelService: HotelService,
    private fb: FormBuilder
  ) {
    this.villaForm = this.fb.group({
      number: ['', Validators.required],
      category: ['1 BHK', Validators.required],
      type: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      row: ['A', Validators.required],
      col: [1, [Validators.required, Validators.min(1)]],
      status: ['Available', Validators.required]
    });

    this.bookingForm = this.fb.group({
      guestName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      checkIn: ['', Validators.required],
      checkOut: ['', Validators.required],
      status: ['Confirmed', Validators.required]
    });

    // Suggest prices based on category
    this.villaForm.get('category')?.valueChanges.subscribe(cat => {
      const prices: any = { '1 BHK': 5000, '2 BHK': 8000, '3 BHK': 12000 };
      if (prices[cat]) this.villaForm.get('price')?.setValue(prices[cat]);
    });
  }

  ngOnInit() {
    const savedPassword = sessionStorage.getItem('admin_master_password');
    if (savedPassword === 'GOD') {
      this.isLocked.set(false);
      this.refreshAll();
    }
  }

  unlock() {
    if (this.passwordInput() === 'GOD') {
      sessionStorage.setItem('admin_master_password', 'GOD');
      this.isLocked.set(false);
      this.loginError.set(false);
      this.refreshAll();
    } else {
      this.loginError.set(true);
      setTimeout(() => this.loginError.set(false), 2000);
    }
  }

  exitAdmin() {
    this.isLocked.set(true);
    window.location.href = '/home';
  }

  signOut() {
    sessionStorage.removeItem('admin_master_password');
    this.isLocked.set(true);
    window.location.href = '/login';
  }

  refreshAll() {
    this.hotelService.getAdminStats().subscribe(s => this.stats.set(s));
    this.hotelService.getVillas().subscribe(v => this.villas.set(v));
    this.hotelService.getAllBookings().subscribe(b => this.bookings.set(b));
  }

  setTab(tab: 'stats' | 'villas' | 'bookings') {
    this.activeTab.set(tab);
  }

  // Villa Management
  openAddVilla() {
    this.editingVillaId.set(null);
    this.villaForm.reset({ category: '1 BHK', row: 'A', col: 1, status: 'Available' });
    this.showVillaModal.set(true);
  }

  openEditVilla(villa: Villa) {
    this.editingVillaId.set(villa.id);
    this.villaForm.patchValue(villa);
    this.showVillaModal.set(true);
  }

  saveVilla() {
    if (this.villaForm.invalid) return;

    const villaData = this.villaForm.value;
    const id = this.editingVillaId();

    if (id) {
      this.hotelService.updateVilla(id, villaData).subscribe(() => {
        this.showVillaModal.set(false);
        this.refreshAll();
      });
    } else {
      this.hotelService.addVilla(villaData).subscribe(() => {
        this.showVillaModal.set(false);
        this.refreshAll();
      });
    }
  }

  deleteVilla(id: number) {
    if (confirm('Are you sure you want to remove this estate from the resort?')) {
      this.hotelService.deleteVilla(id).subscribe(() => this.refreshAll());
    }
  }

  // Booking Management
  openEditBooking(booking: Booking) {
    this.editingBookingId.set(booking._id || booking.id || null);
    this.bookingForm.patchValue(booking);
    this.showBookingModal.set(true);
  }

  saveBooking() {
    if (this.bookingForm.invalid) return;
    const id = this.editingBookingId();
    if (!id) return;

    this.hotelService.adminUpdateBooking(id, this.bookingForm.value).subscribe(() => {
      this.showBookingModal.set(false);
      this.refreshAll();
    });
  }

  deleteBooking(id?: string) {
    if (!id) return;
    if (confirm('DANGER: Permanently remove this reservation? This will free up the villa immediately.')) {
      this.hotelService.adminDeleteBooking(id).subscribe(() => this.refreshAll());
    }
  }

  getStatusClass(status?: string) {
    switch (status) {
      case 'Available': return 'bg-emerald-100 text-emerald-700';
      case 'Booked': return 'bg-amber-100 text-amber-700';
      case 'Confirmed': return 'bg-blue-100 text-blue-700';
      case 'Cancelled': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  }
}
