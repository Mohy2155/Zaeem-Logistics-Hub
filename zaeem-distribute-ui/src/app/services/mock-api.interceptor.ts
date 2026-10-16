import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of, throwError, timer } from 'rxjs';
import { delay, mergeMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { handleMockRequest, isMockApiUrl } from './mock-api';

/** Simulated network latency, so loading states show in the demo as they do against the real API. */
const MOCK_LATENCY_MS = 600;

/**
 * Standalone Mock Interceptor
 *
 * Logic:
 * 1. Checks the environment's `useMockData` flag (set for the GitHub Pages demo build).
 * 2. If set, API requests are answered in the browser by `handleMockRequest` (mock-api.ts), backed by localStorage.
 * 3. Otherwise requests pass through to the actual .NET API.
 */
export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.useMockData || !isMockApiUrl(req.url)) {
    // Pass non-API assets (styles, assets) and real-API requests through normally
    return next(req);
  }

  console.warn(`[Production-Mock] Intercepting request to: ${req.url}`);
  const { status, body } = handleMockRequest(req.method, req.url, req.body);

  if (status >= 400) {
    // Fails the request the way the real API would, after the same simulated latency
    return timer(MOCK_LATENCY_MS).pipe(
      mergeMap(() => throwError(() => new HttpErrorResponse({ status, error: body, url: req.url })))
    );
  }

  // Short-circuit the request and return a fabricated HttpResponse
  return of(new HttpResponse({ status, body, url: req.url })).pipe(delay(MOCK_LATENCY_MS));
};
