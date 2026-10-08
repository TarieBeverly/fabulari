import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, UrlTree } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { BACKEND_URL } from '../services/backend';

describe('Session navigation and authentication', () => {
  let http: HttpTestingController;
  let auth: AuthService;
  const user = { id: 'demo-id', username: 'demo', roles: ['User'] };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });
  afterEach(() => http.verify());
  const guarded = () => TestBed.runInInjectionContext(() => authGuard({} as any, {} as any)) as Observable<boolean | UrlTree>;
  it('restores a valid server session before allowing protected navigation', async () => {
    const result = firstValueFrom(guarded());
    const req = http.expectOne(BACKEND_URL + '/api/auth/me');
    expect(req.request.withCredentials).toBeTrue();
    req.flush({ user });
    expect(await result).toBeTrue();
    expect(auth.currentUser()).toEqual(user);
  });
  it('redirects expired sessions to sign in and clears stale identity', async () => {
    auth.currentUser.set(user);
    const result = firstValueFrom(guarded());
    http.expectOne(BACKEND_URL + '/api/auth/me').flush({ message: 'Please sign in.' }, { status: 401, statusText: 'Unauthorized' });
    expect((await result).toString()).toBe('/login');
    expect(auth.currentUser()).toBeNull();
  });
  it('does not grant access when the session service is unavailable', async () => {
    const result = firstValueFrom(guarded());
    http.expectOne(BACKEND_URL + '/api/auth/me').error(new ProgressEvent('error'));
    expect((await result).toString()).toBe('/login');
  });
  it('stores identity only after a successful credentialed login', async () => {
    const result = firstValueFrom(auth.login('demo', 'Testing123!'));
    const req = http.expectOne(BACKEND_URL + '/api/auth/login');
    expect(req.request.withCredentials).toBeTrue();
    req.flush({ user });
    await result;
    expect(auth.currentUser()).toEqual(user);
  });
  it('keeps a failed login unauthenticated', async () => {
    const result = firstValueFrom(auth.login('demo', 'wrong')).catch(() => null);
    http.expectOne(BACKEND_URL + '/api/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });
    await result;
    expect(auth.currentUser()).toBeNull();
  });
  it('clears identity after confirmed logout', async () => {
    auth.currentUser.set(user);
    const result = firstValueFrom(auth.logout());
    http.expectOne(BACKEND_URL + '/api/auth/logout').flush({ message: 'Signed out.' });
    await result;
    expect(auth.currentUser()).toBeNull();
  });
});
