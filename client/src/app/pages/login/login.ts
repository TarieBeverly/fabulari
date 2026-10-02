import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  username = '';
  password = '';
  errorMessage = '';
  isSubmitting = false;

  onSubmit(): void {
    if (this.isSubmitting) return;

    this.errorMessage = '';

    if (!this.username.trim() || !this.password) {
      this.errorMessage = 'Please enter your username and password.';
      return;
    }

    this.isSubmitting = true;

    this.auth.login(this.username.trim(), this.password).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.password = '';
       void this.router.navigate(['/dashboard']);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting = false;
        this.errorMessage = error.status === 0
          ? 'Cannot connect to the server. Check that the backend is running.'
          : error.error?.message || 'Unable to sign in. Please try again.';
      }
    });
  }
}