import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  errorMessage = '';
  isSigningOut = false;

  signOut(): void {
    if (this.isSigningOut) return;

    this.errorMessage = '';
    this.isSigningOut = true;

    this.auth.logout().subscribe({
      next: () => {
        this.isSigningOut = false;
        void this.router.navigate(['/login']);
      },
      error: (error: HttpErrorResponse) => {
        this.isSigningOut = false;
        this.errorMessage = error.status === 0
          ? 'Cannot connect to the server. Please try again.'
          : 'Unable to sign out. Please try again.';
      }
    });
  }
}