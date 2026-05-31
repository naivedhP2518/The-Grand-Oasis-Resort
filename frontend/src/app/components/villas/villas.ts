import { Component, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HotelService, Villa, Booking } from '../../services/hotel';
import { AuthService } from '../../services/auth';
import { UploadService } from '../../services/upload.service';
import { Router } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

export type BookingPhase = 'search' | 'selection' | 'rooms' | 'details' | 'identity' | 'payment' | 'success';

declare var Razorpay: any;

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
  lastTransactionId = signal<string | null>(null);
  searchingLoading = signal(false);
  
  // Review System Signals
  reviews = signal<any[]>([]);
  ratingSummary = signal<any>({ average: 0, total: 0, stars: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
  newReviewRating = signal<number>(5);
  newReviewComment = signal<string>('');
  submittingReview = signal<boolean>(false);
  bookingId = Math.floor(100000 + Math.random() * 900000);

  // Advanced Search & Filter System Signals
  searchQuery = signal<string>('');
  maxPriceFilter = signal<number>(25000);
  minRatingFilter = signal<number>(0);
  selectedCategoryFilter = signal<string>('All');
  filterSubject = new Subject<void>();

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
    private router: Router,
    private socketService: SocketService
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
      paymentMethod: ['credit-card'],
      paymentType: ['Full']
    });

    // Real-time socket events integration
    this.socketService.onAvailabilityChange().subscribe(() => {
      console.log('🔄 [SOCKET] Availability change event detected. Refreshing list...');
      const current = this.currentPhase();
      if (current === 'selection' || current === 'rooms') {
        const checkIn = this.bookingForm.get('checkIn')?.value;
        const checkOut = this.bookingForm.get('checkOut')?.value;
        const guests = this.bookingForm.get('guests')?.value;
        
        if (checkIn && checkOut && guests) {
          this.executeFilteredSearch(); // Keep filters intact during real-time updates
        }
      }
    });

    // Advanced filtering pipeline with debouncing
    this.filterSubject.pipe(
      debounceTime(400)
    ).subscribe(() => {
      console.log('🔍 [FILTER] Triggering debounced search...');
      this.executeFilteredSearch();
    });
  }

  get f() { return this.bookingForm.controls; }

  executeFilteredSearch() {
    const checkIn = this.bookingForm.get('checkIn')?.value;
    const checkOut = this.bookingForm.get('checkOut')?.value;
    const guests = this.bookingForm.get('guests')?.value;

    if (!checkIn || !checkOut || !guests) return;

    this.searchingLoading.set(true);

    const category = this.selectedCategoryFilter();
    const minRating = this.minRatingFilter();
    
    const filters: any = {
      maxPrice: this.maxPriceFilter(),
      search: this.searchQuery().trim() || undefined
    };

    if (category !== 'All') {
      filters.category = category;
    }
    if (minRating > 0) {
      filters.rating = minRating;
    }

    this.hotelService.checkAvailability(checkIn, checkOut, guests, filters).subscribe({
      next: (v) => {
        console.log(`[FILTER] Found ${v.length} filtered villas.`);
        this.villas.set(v);
        this.searchingLoading.set(false);
      },
      error: (err) => {
        console.error('[FILTER] Compound search error:', err);
        this.searchingLoading.set(false);
      }
    });
  }

  searchAvailability() {
    if (this.bookingForm.get('checkIn')?.invalid || this.bookingForm.get('checkOut')?.invalid || this.bookingForm.get('guests')?.invalid) {
      alert('Please select valid dates and number of guests.');
      return;
    }

    // Reset filters to defaults on new search
    this.searchQuery.set('');
    this.maxPriceFilter.set(25000);
    this.minRatingFilter.set(0);
    this.selectedCategoryFilter.set('All');

    this.executeFilteredSearch();
    this.currentPhase.set('selection');
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
    this.loadVillaReviews(room.id);
  }

  loadVillaReviews(villaId: number) {
    this.hotelService.getVillaReviews(villaId).subscribe({
      next: (res) => {
        this.reviews.set(res.reviews);
        this.ratingSummary.set(res.summary);
      },
      error: (err) => console.error('[REVIEWS] Failed to fetch reviews:', err)
    });
  }

  submitReview() {
    const room = this.selectedRoom();
    if (!room) return;

    const rating = this.newReviewRating();
    const comment = this.newReviewComment().trim();

    if (!comment) {
      alert("Please write a feedback comment.");
      return;
    }

    this.submittingReview.set(true);
    this.hotelService.postVillaReview(room.id, { rating, comment }).subscribe({
      next: (res) => {
        alert("Thank you! Your verified stay review has been published.");
        this.newReviewComment.set('');
        this.newReviewRating.set(5);
        this.submittingReview.set(false);
        this.loadVillaReviews(room.id); // Reload
      },
      error: (err) => {
        console.error('[REVIEWS] Post error:', err);
        this.submittingReview.set(false);
        alert(err.error?.message || "Only verified guests who have completed a stay in this villa can leave a review.");
      }
    });
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

    // Flow: 1. Create Booking -> 2. Initialize Razorpay Order -> 3. Verification -> 4. Success
    this.hotelService.createBooking(booking).subscribe({
      next: (response) => {
        console.log('[BOOKING] Success reply from backend:', response);
        const createdBooking = response.booking;
        
        // 2. Initialize Razorpay Order
        const type = vals.paymentType || 'Full';
        this.hotelService.createRazorpayOrder(createdBooking._id, type).subscribe({
          next: (orderData) => {
            console.log('[PAYMENT] Razorpay order initialized:', orderData);
            
            // Check if mock mode is active to execute a simulated checkout
            if (orderData.orderId.startsWith('order_mock_')) {
              console.log('[PAYMENT] Mock sandbox payment order detected. Simulating secure checkout...');
              setTimeout(() => {
                const payload = {
                  razorpayOrderId: orderData.orderId,
                  razorpayPaymentId: `pay_mock_${Math.random().toString(36).substring(2, 15)}`,
                  razorpaySignature: 'mock_signature_bypass_key'
                };
                
                this.hotelService.verifyRazorpaySignature(payload).subscribe({
                  next: (verifyRes) => {
                    console.log('[PAYMENT] Mock Payment captured successfully:', verifyRes);
                    this.lastTransactionId.set(verifyRes.transactionId);
                    this.bookingLoading.set(false);
                    this.currentPhase.set('success');

                    // Cache the invoice for offline PWA viewing
                    try {
                      const stored = localStorage.getItem('grand_oasis_cached_invoices');
                      const list = stored ? JSON.parse(stored) : [];
                      const isDup = list.some((item: any) => item.id === verifyRes.transactionId);
                      if (!isDup) {
                        list.push({
                          id: verifyRes.transactionId,
                          villaName: booking.villaName,
                          checkIn: booking.checkIn,
                          checkOut: booking.checkOut,
                          totalPrice: booking.totalPrice,
                          guestName: booking.guestName
                        });
                        localStorage.setItem('grand_oasis_cached_invoices', JSON.stringify(list));
                      }
                    } catch (e) {
                      console.error('Failed to cache invoice', e);
                    }
                  },
                  error: (verifyErr) => {
                    console.error('[PAYMENT] Mock verification error:', verifyErr);
                    this.bookingLoading.set(false);
                    alert(verifyErr.error?.message || 'Payment signature verification failed.');
                  }
                });
              }, 1500);
              return;
            }
            
            // 3. Open Razorpay checkout pop-up window
            const options = {
              key: orderData.keyId,
              amount: orderData.amount,
              currency: orderData.currency,
              name: 'The Grand Oasis Resort',
              description: `Stay Reservation at ${booking.villaName}`,
              order_id: orderData.orderId,
              handler: (res: any) => {
                this.bookingLoading.set(true);
                // 4. Verify cryptographic signature on backend
                const payload = {
                  razorpayOrderId: res.razorpay_order_id,
                  razorpayPaymentId: res.razorpay_payment_id,
                  razorpaySignature: res.razorpay_signature
                };
                
                this.hotelService.verifyRazorpaySignature(payload).subscribe({
                  next: (verifyRes) => {
                    console.log('[PAYMENT] Signature verified:', verifyRes);
                    this.lastTransactionId.set(verifyRes.transactionId);
                    this.bookingLoading.set(false);
                    this.currentPhase.set('success');

                    // Cache the invoice for offline PWA viewing
                    try {
                      const stored = localStorage.getItem('grand_oasis_cached_invoices');
                      const list = stored ? JSON.parse(stored) : [];
                      const isDup = list.some((item: any) => item.id === verifyRes.transactionId);
                      if (!isDup) {
                        list.push({
                          id: verifyRes.transactionId,
                          villaName: booking.villaName,
                          checkIn: booking.checkIn,
                          checkOut: booking.checkOut,
                          totalPrice: booking.totalPrice,
                          guestName: booking.guestName
                        });
                        localStorage.setItem('grand_oasis_cached_invoices', JSON.stringify(list));
                      }
                    } catch (e) {
                      console.error('Failed to cache invoice', e);
                    }
                  },
                  error: (verifyErr) => {
                    console.error('[PAYMENT] Verification error:', verifyErr);
                    this.bookingLoading.set(false);
                    alert(verifyErr.error?.message || 'Payment signature verification failed.');
                  }
                });
              },
              prefill: {
                name: booking.guestName,
                email: booking.email,
                contact: booking.phone
              },
              notes: {
                bookingId: createdBooking._id
              },
              theme: {
                color: '#b45309' // Premium luxury amber-700 / gold tone
              },
              modal: {
                ondismiss: () => {
                  this.bookingLoading.set(false);
                  alert('Payment window dismissed by guest.');
                }
              }
            };
            
            const rzp = new Razorpay(options);
            rzp.open();
          },
          error: (orderErr) => {
            console.error('[PAYMENT] Order creation error:', orderErr);
            this.bookingLoading.set(false);
            alert(orderErr.error?.message || 'Failed to initialize payment gateway.');
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
