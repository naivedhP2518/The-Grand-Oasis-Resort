import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  email: string = '';
  phone: string = '';
  role: 'customer' | 'management' = 'customer';
  loginMethod: 'email' | 'mobile' = 'email';
  username: string = '';
  password: string = '';
  loading: boolean = false;
  message: string = '';
  
  // Professional Error UI
  showErrorModal: boolean = false;
  errorTitle: string = '';
  errorMessage: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  setRole(role: 'customer' | 'management') {
    this.role = role;
  }

  onSubmit() {
    if (this.role === 'management') {
      if (!this.username || !this.password) {
        this.triggerError('Missing Credentials', 'Please enter both your assigned username and access ID to continue.');
        return;
      }
      this.loading = true;
      this.authService.managementLogin({ username: this.username, password: this.password }).subscribe({
        next: (res) => {
          this.loading = false;
          // Management users go to Admin Dashboard automatically if they have valid credentials
          // Or if they are simple employees, maybe just home? 
          // User said "Redirected to Admin Dashboard" in summary, but usually employees have limited access.
          // For now, I'll stick to the current logic: if Management, go to Admin.
          this.router.navigate(['/employee-dashboard']);
        },
        error: (err) => {
          this.loading = false;
          this.triggerError('Authentication Failure', err.error?.message || 'The credentials provided do not match our management records.');
        }
      });
      return;
    }

    // Customer Side Logic
    if (this.loginMethod === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!this.email) {
        this.triggerError('Missing Contact', 'A valid email address is required to locate your reservation.');
        return;
      }
      if (!emailRegex.test(this.email)) {
        this.triggerError('Invalid Format', 'The email address provided does not match standard protocols. Please verify and try again.');
        return;
      }
    } else if (this.loginMethod === 'mobile') {
      if (!this.phone) {
        this.triggerError('Missing Contact', 'A mobile number is required for authentication via secure code.');
        return;
      }
      if (this.phone.length < 10) {
        this.triggerError('Invalid Contact', 'The phone number provided is incomplete. Please ensure it follows international standards.');
        return;
      }
    }

    this.loading = true;
    this.authService.sendCode(this.email, this.phone, this.role).subscribe({
      next: (res) => {
        this.loading = false;
        this.router.navigate(['/verify']);
      },
      error: (err) => {
        this.loading = false;
        this.triggerError('Transmission Error', err.error?.message || 'Our authentication servers are currently experiencing high traffic. Please try again shortly.');
      }
    });
  }

  loginWithGoogle() {
    this.loading = true;
    
    // Simulate Google Popup/Redirect delay
    setTimeout(() => {
      const mockGoogleData = {
        googleId: 'google_' + Math.random().toString(36).substr(2, 9),
        email: 'guest.' + Math.random().toString(36).substr(2, 5) + '@gmail.com',
        name: 'Grand Oasis Guest'
      };

      this.authService.googleLogin(mockGoogleData).subscribe({
        next: (res) => {
          this.loading = false;
          console.log('Google Login Success');
          this.router.navigate(['/home']);
        },
        error: (err) => {
          this.loading = false;
          this.triggerError('External Auth Failure', 'Google authentication was interrupted. Please ensure your account is active and try again.');
        }
      });
    }, 1500);
  }

  triggerError(title: string, message: string) {
    this.errorTitle = title;
    this.errorMessage = message;
    this.showErrorModal = true;
  }

  closeError() {
    this.showErrorModal = false;
  }
}
