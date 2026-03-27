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
  loading: boolean = false;
  message: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    console.log('Login form submitted with email:', this.email);
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!this.email) {
      this.message = 'Email Required';
      return;
    }

    if (!emailRegex.test(this.email)) {
      this.message = 'Invalid Email';
      return;
    }

    this.loading = true;
    this.authService.sendCode(this.email).subscribe({
      next: (res) => {
        console.log('Navigate to verify');
        this.loading = false;
        this.router.navigate(['/verify']);
      },
      error: (err) => {
        console.error('Login submit error:', err);
        this.loading = false;
        this.message = err.error?.message || 'Login Failed Plese Try Again';
      }
    });
  }
}
