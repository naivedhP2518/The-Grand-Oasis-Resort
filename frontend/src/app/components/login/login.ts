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
  mode: 'login' | 'register' | 'employee' = 'login';
  
  // Form fields
  email = '';
  password = '';
  username = '';
  phone = '';

  loading = false;
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  toggleMode() {
    if (this.mode === 'employee') {
      this.mode = 'login';
    } else {
      this.mode = this.mode === 'login' ? 'register' : 'login';
    }
    this.errorMessage = '';
    this.password = '';
    this.username = '';
  }

  switchToEmployee() {
    this.mode = 'employee';
    this.errorMessage = '';
    this.password = '';
    this.username = '';
  }

  onSubmit() {
    if (this.mode === 'employee') {
      if (!this.username || !this.password) {
        this.errorMessage = 'Username and password are required.';
        return;
      }

      this.loading = true;
      this.errorMessage = '';

      this.authService.managementLogin({ username: this.username, password: this.password }).subscribe({
        next: (res) => {
          this.loading = false;
          this.handleRedirect(res.user?.role);
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.error?.message || 'Employee login failed. Please check your credentials.';
          setTimeout(() => {
            this.errorMessage = '';
          }, 5000);
        }
      });
      return;
    }

    if (!this.email || !this.password) {
      this.errorMessage = 'Email and password are required.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    if (this.mode === 'login') {
      this.authService.login({ email: this.email, password: this.password }).subscribe({
        next: (res) => {
          this.loading = false;
          this.handleRedirect(res.user?.role);
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.error?.message || 'Login failed. Please check your credentials.';
          setTimeout(() => {
            this.errorMessage = '';
          }, 5000);
        }
      });
    } else {
      this.authService.register({ 
        email: this.email, 
        password: this.password, 
        username: this.username, 
        phone: this.phone 
      }).subscribe({
        next: (res) => {
          this.loading = false;
          this.handleRedirect(res.user?.role);
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.error?.message || 'Registration failed. Please try again.';
          setTimeout(() => {
            this.errorMessage = '';
          }, 5000);
        }
      });
    }
  }

  private handleRedirect(role: string) {
    if (role === 'admin') {
      this.router.navigate(['/admin']);
    } else if (role === 'management') {
      this.router.navigate(['/employee-dashboard']);
    } else {
      this.router.navigate(['/home']);
    }
  }
}
