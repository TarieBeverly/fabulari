import { BACKEND_URL } from '../../services/backend';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
@Component({ selector: 'app-login', standalone: true, imports: [FormsModule], templateUrl: './login.html', styleUrl: './login.css' })
export class Login implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  username = ''; password = ''; errorMessage = ''; notice = ''; isSubmitting = false; register = false; bootstrap = false;
  firstName = ''; lastName = ''; email = ''; dateOfBirth = '';
  ngOnInit(): void { this.http.get<{ required: boolean }>(BACKEND_URL + '/api/auth/bootstrap').subscribe({ next: r => { this.bootstrap = r.required; this.register = r.required; }, error: () => this.errorMessage = 'Cannot reach the backend. Start the Express server.' }); }
  onSubmit(): void {
    if (this.isSubmitting) return; this.errorMessage = ''; this.notice = '';
    if (!this.username.trim() || !this.password) { this.errorMessage = 'Please enter your username and password.'; return; }
    this.isSubmitting = true;
    if (this.register) {
      this.http.post(BACKEND_URL + '/api/auth/' + (this.bootstrap ? 'bootstrap' : 'register'), { username: this.username.trim(), password: this.password, firstName: this.firstName, lastName: this.lastName, email: this.email, dateOfBirth: this.dateOfBirth }).subscribe({ next: () => { this.isSubmitting = false; this.register = false; this.bootstrap = false; this.password = ''; this.notice = 'Account created. Sign in with your new credentials.'; }, error: e => this.failed(e) });
    } else this.auth.login(this.username.trim(), this.password).subscribe({ next: () => { this.isSubmitting = false; this.password = ''; void this.router.navigate(['/dashboard']); }, error: e => this.failed(e) });
  }
  failed(e: HttpErrorResponse): void { this.isSubmitting = false; this.errorMessage = e.status === 0 ? 'Cannot connect to the backend. Check that the server is running.' : e.error?.message || 'Unable to complete this action.'; }
}
