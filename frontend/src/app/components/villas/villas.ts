import { Component, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HotelService, Villa, Booking } from '../../services/hotel';
import { AuthService } from '../../services/auth';
import { UploadService } from '../../services/upload.service';
import { Router } from '@angular/router';

export type BookingPhase = 'search' | 'selection' | 'rooms' | 'details' | 'identity' | 'payment' | 'success';

interface VillaCard {
  type: '1 BHK' | '2 BHK' | '3 BHK';
  title: string;
  description: string;
  price: number;
  image: string;
  icon: string;
}

@Component({
  selector: 'app-villas',
  standalone: false,
  templateUrl: './villas.html',
  styleUrl: './villas.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Villas implements OnInit {
  currentPhase = signal<BookingPhase>('search');
  selectedVillaType = signal<VillaCard | null>(null);
  selectedRoom = signal<Villa | null>(null);
  
  bookingForm!: FormGroup;

  formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Calendar State
  viewDate = signal(new Date());
  activePicker = signal<'checkIn' | 'checkOut' | null>(null);

  calendarDays = computed(() => {
    const date = this.viewDate();
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    // Days in current month
    const days = [];
    
    // Padding from previous month
    const startDay = startOfMonth.getDay();
    const prevMonthEnd = new Date(date.getFullYear(), date.getMonth(), 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ 
        date: new Date(date.getFullYear(), date.getMonth() - 1, prevMonthEnd - i), 
        currentMonth: false 
      });
    }
    
    // Current month days
    for (let i = 1; i <= endOfMonth.getDate(); i++) {
      days.push({ 
        date: new Date(date.getFullYear(), date.getMonth(), i), 
        currentMonth: true 
      });
    }
    
    // Padding for next month to make it 42 days (6 weeks)
    const padding = 42 - days.length;
    for (let i = 1; i <= padding; i++) {
      days.push({ 
        date: new Date(date.getFullYear(), date.getMonth() + 1, i), 
        currentMonth: false 
      });
    }
    
    return days;
  });

  uploadProgress = signal(0);
  bookingLoading = signal(false);
  searchingLoading = signal(false);
  bookingId = Math.floor(100000 + Math.random() * 900000);

  // Real-time stats
  villas = signal<Villa[]>([]);
  stats = computed(() => {
    const all = this.villas();
    return {
      total: all.length,
      available: all.length, // Only available ones are returned by the dynamic search
      booked: 0
    };
  });

  villaCards: VillaCard[] = [
    {
      type: '1 BHK',
      title: 'Studio Oasis',
      description: 'Elegant sanctuary perfect for couples or solo travelers seeking harmony.',
      price: 5000,
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80',
      icon: 'fa-house-user'
    },
    {
      type: '2 BHK',
      title: 'Family Retreat',
      description: 'Spacious residence designed for families seeking luxury and comfort.',
      price: 8000,
      image: '/family_retreat_2bhk.png',
      icon: 'fa-people-roof'
    },
    {
      type: '3 BHK',
      title: 'Grand Azure Villa',
      description: 'Ultimate estate experience with panoramic views and premium amenities.',
      price: 12000,
      image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80',
      icon: 'fa-wheat-awn-circle-exclamation'
    }
  ];

  constructor(
    private fb: FormBuilder,
    private hotelService: HotelService, 
    private authService: AuthService,
    private uploadService: UploadService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const defaultCheckIn = new Date();
    const defaultCheckOut = new Date();
    defaultCheckOut.setDate(defaultCheckOut.getDate() + 3);

    this.bookingForm = this.fb.group({
      checkIn: [this.formatDate(defaultCheckIn), Validators.required],
      checkOut: [this.formatDate(defaultCheckOut), Validators.required],
      guests: [1, [Validators.required, Validators.min(1)]],
      name: ['', Validators.required],
      address: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern('^[+0-9\\s\\-]{10,20}$')]],
      email: ['', [Validators.required, Validators.email]],
      idProof: [null],
      idProofUrl: [null],
      paymentMethod: ['credit-card']
    });
  }

  get f() { return this.bookingForm.controls; }

  searchAvailability() {
    if (this.bookingForm.get('checkIn')?.invalid || this.bookingForm.get('checkOut')?.invalid || this.bookingForm.get('guests')?.invalid) {
      alert('Please select valid dates and number of guests.');
      return;
    }

    const checkIn = this.bookingForm.get('checkIn')?.value;
    const checkOut = this.bookingForm.get('checkOut')?.value;
    const guests = this.bookingForm.get('guests')?.value;

    this.searchingLoading.set(true);
    
    this.hotelService.checkAvailability(checkIn, checkOut, guests).subscribe({
      next: (v) => {
        console.log(`[SYSTEM] Villas available: ${v.length} found.`);
        this.villas.set(v);
        this.searchingLoading.set(false);
        this.currentPhase.set('selection');
      },
      error: (err) => {
        console.error('[SYSTEM] Availability check error:', err);
        this.searchingLoading.set(false);
        alert(err.error?.message || 'Failed to check availability.');
      }
    });
  }

  availableCount(type: string): number {
    return this.villas().filter(v => v.category === type).length;
  }

  selectVillaType(card: VillaCard) {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    if (this.availableCount(card.type) === 0) {
      return; // disabled
    }
    this.selectedVillaType.set(card);
    this.currentPhase.set('rooms');
  }

  selectRoom(room: Villa) {
    this.selectedRoom.set(room);
    this.currentPhase.set('details');
  }

  filteredRooms = computed(() => {
    const type = this.selectedVillaType()?.type;
    return this.villas().filter(v => v.category === type);
  });

  goToPhase(phase: BookingPhase) {
    this.currentPhase.set(phase);
  }

  onFileUpload(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.bookingForm.patchValue({ idProof: file });
      this.uploadProgress.set(10); // Start progress

      this.uploadService.uploadIdProof(file).subscribe({
        next: (res) => {
          this.uploadProgress.set(100);
          this.bookingForm.patchValue({ idProofUrl: res.url });
        },
        error: (err) => {
          console.error('Upload failed:', err);
          this.uploadProgress.set(0);
          alert('File upload failed. Please try again.');
        }
      });
    }
  }

  finalizeBooking() {
    // Force form validation check
    this.bookingForm.markAllAsTouched();
    if (this.bookingForm.invalid) {
      alert("Please fill all required fields correctly.");
      return;
    }

    this.bookingLoading.set(true);
    
    const room = this.selectedRoom();
    if (!room) {
      this.bookingLoading.set(false);
      return;
    }

    const card = this.selectedVillaType();
    if (!card) return;

    const vals = this.bookingForm.value;
    const totalPrice = card.price * 1.15; // 15% VIP Service & Experience Fee
    
    const booking: Booking = {
      villaName: `${room.category} - House ${room.number}`,
      villaId: room.id,
      guestName: vals.name,
      phone: vals.phone,
      email: vals.email,
      address: vals.address,
      idProofUrl: vals.idProofUrl ?? undefined,
      guests: vals.guests,
      checkIn: vals.checkIn,
      checkOut: vals.checkOut,
      totalPrice: totalPrice
    };

    // Flow: 1. Create Booking -> 2. Process Payment -> 3. Success
    this.hotelService.createBooking(booking).subscribe({
      next: (response) => {
        console.log('[BOOKING] Success reply from backend:', response);
        const createdBooking = response.booking;
        
        // Process Payment
        this.hotelService.processPayment(createdBooking._id, vals.paymentMethod, totalPrice).subscribe({
          next: (paymentResponse) => {
            console.log('[PAYMENT] Payment successful:', paymentResponse);
            this.bookingLoading.set(false);
            this.currentPhase.set('success');
          },
          error: (err) => {
            console.error('[PAYMENT] Payment error:', err);
            this.bookingLoading.set(false);
            alert('Booking created, but payment failed. Please contact support.');
            this.currentPhase.set('success'); // Proceed anyway for now or handle appropriately
          }
        });
      },
      error: (err) => {
        this.bookingLoading.set(false);
        alert(err.error?.message || 'Booking failed.');
      }
    });
  }

  reset() {
    this.currentPhase.set('search');
    this.selectedVillaType.set(null);
    this.selectedRoom.set(null);
    this.bookingForm.reset();
    
    // reset to defaults
    const defaultCheckIn = new Date();
    const defaultCheckOut = new Date();
    defaultCheckOut.setDate(defaultCheckOut.getDate() + 3);
    this.bookingForm.patchValue({
      checkIn: this.formatDate(defaultCheckIn),
      checkOut: this.formatDate(defaultCheckOut),
      guests: 1,
      paymentMethod: 'credit-card'
    });

    this.bookingId = Math.floor(100000 + Math.random() * 900000);
    this.villas.set([]);
    this.router.navigate(['/home']);
  }

  // Calendar Helpers
  togglePicker(picker: 'checkIn' | 'checkOut') {
    if (this.activePicker() === picker) {
      this.activePicker.set(null);
    } else {
      this.activePicker.set(picker);
      const currentVal = this.bookingForm.get(picker)?.value;
      if (currentVal) this.viewDate.set(new Date(currentVal));
    }
  }

  changeMonth(offset: number) {
    const current = this.viewDate();
    this.viewDate.set(new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  selectCalendarDate(date: Date) {
    const formatted = this.formatDate(date);
    const picker = this.activePicker();
    
    if (picker === 'checkIn') {
      this.bookingForm.patchValue({ checkIn: formatted });
      const checkOutDate = new Date(this.bookingForm.get('checkOut')?.value);
      if (date >= checkOutDate) {
        const nextDay = new Date(date);
        nextDay.setDate(date.getDate() + 1);
        this.bookingForm.patchValue({ checkOut: this.formatDate(nextDay) });
      }
    } else if (picker === 'checkOut') {
      const checkInDate = new Date(this.bookingForm.get('checkIn')?.value);
      if (date <= checkInDate) {
        alert("Check-out must be after check-in.");
        return;
      }
      this.bookingForm.patchValue({ checkOut: formatted });
    }
    
    this.activePicker.set(null);
  }

  isDateSelected(date: Date): boolean {
    const formatted = this.formatDate(date);
    return formatted === this.bookingForm.get('checkIn')?.value || formatted === this.bookingForm.get('checkOut')?.value;
  }

  isToday(date: Date): boolean {
    return date.toDateString() === new Date().toDateString();
  }

  isDateDisabled(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }
}
