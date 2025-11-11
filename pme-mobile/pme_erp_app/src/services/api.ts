import { Preferences } from '@capacitor/preferences';

interface LoginResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

interface AttendancePayload {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  reportTime: string;
}

class ApiService {
  private baseUrl: string;
  private token: string | null;

  constructor(baseUrl?: string) {
    // During development prefer a relative /api so Vite's dev proxy can forward requests
    // to the real backend and avoid CORS/preflight redirect issues. In production use
    // the absolute backend URL.
    const devDefault = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.DEV)
      ? '/api'
      : 'https://ke.erpproject.online/public/api';
    this.baseUrl = baseUrl ?? devDefault;
    this.token = null;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.endsWith('/api') ? url : `${url}/api`;
  }

  async getStoredToken(): Promise<string | null> {
    if (this.token) return this.token;
    
    const { value } = await Preferences.get({ key: 'auth_token' });
    this.token = value;
    return value;
  }

  async setStoredToken(token: string): Promise<void> {
    this.token = token;
    await Preferences.set({ key: 'auth_token', value: token });
  }

  async clearStoredToken(): Promise<void> {
    this.token = null;
    await Preferences.remove({ key: 'auth_token' });
    await Preferences.remove({ key: 'user_data' });
    // Clear any other auth-related data if needed
  }


  private async getHeaders(): Promise<HeadersInit> {
    const token = await this.getStoredToken();
    if (!token) {
      console.error('No authentication token available');
      throw new Error('Authentication required. Please log in again.');
    }
    
    // Avoid sending X-Requested-With when using a relative /api base (dev proxy),
    // since that header triggers a CORS preflight when calling the remote server
    // directly from the browser. Only set it when baseUrl looks like an absolute
    // remote URL (starts with http).
    const isRemote = /^https?:\/\//i.test(this.baseUrl);
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(isRemote ? { 'X-Requested-With': 'XMLHttpRequest' } : {}),
      'Authorization': `Bearer ${token}`
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      // Try to extract useful error information from the response body
      const text = await response.text().catch(() => '');
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const errorData = JSON.parse(text || '{}');
        if (errorData.message) errorMessage = errorData.message;
        else if (errorData.error) errorMessage = errorData.error;
      } catch (e) {
        // not JSON
        if (text) errorMessage = `${errorMessage}: ${text}`;
      }
      const err = new Error(errorMessage) as any;
      err.status = response.status;
      err.body = text;
      throw err;
    }
    // parse JSON (if empty body, return empty object)
    const text = await response.text().catch(() => '');
    return text ? JSON.parse(text) as T : ({} as T);
  }

  // Authentication endpoints
  async login(email: string, password: string): Promise<LoginResponse> {
    const payload = { email, username: email, password };
    console.debug('[api] POST', `${this.baseUrl}/auth/login`, payload);

    const tryJsonPost = async (url: string) => {
      console.debug('[api] POST JSON', url, payload);
      const resp = await fetch(url, {
        method: 'POST',
        headers: await this.getHeaders(),
        body: JSON.stringify(payload),
      });
      const text = await resp.text().catch(() => '');
      console.debug('[api] response', url, resp.status, text);
      if (!resp.ok) {
        const err: any = new Error(text || `Request failed with status ${resp.status}`);
        err.status = resp.status;
        err.body = text;
        throw err;
      }
      return text ? (JSON.parse(text) as LoginResponse) : ({} as LoginResponse);
    };

    const tryFormPost = async (url: string) => {
      console.debug('[api] POST Form', url, { username: email, password });
      const headers = { ...(await this.getHeaders()) } as any;
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      const body = new URLSearchParams({ username: email, password }).toString();
      const resp = await fetch(url, { method: 'POST', headers, body });
      const text = await resp.text().catch(() => '');
      console.debug('[api] response', url, resp.status, text);
      if (!resp.ok) {
        const err: any = new Error(text || `Request failed with status ${resp.status}`);
        err.status = resp.status;
        err.body = text;
        throw err;
      }
      return text ? (JSON.parse(text) as LoginResponse) : ({} as LoginResponse);
    };

    // list of candidate URLs to try (relative to configured base)
    const candidates: string[] = [];
  // preferred login endpoints (server uses /public/api/login)
  candidates.push(`${this.baseUrl}/login`);
  candidates.push(`${this.baseUrl}/login/`);
  // also try auth/login variants for compatibility
  candidates.push(`${this.baseUrl}/auth/login`);
  candidates.push(`${this.baseUrl}/auth/login/`);

    // also try base root variants (in case baseUrl contains /api)
    const baseRoot = this.baseUrl.replace(/\/api\/?$/, '');
    if (baseRoot && baseRoot !== this.baseUrl) {
      candidates.push(`${baseRoot}/public/api/auth/login`);
      candidates.push(`${baseRoot}/api/auth/login`);
      candidates.push(`${baseRoot}/auth/login`);
    }

    // dedupe
    const uniqueCandidates = Array.from(new Set(candidates));

    // try JSON first for each candidate, with a form fallback for the primary endpoint
    let lastError: any = null;
    for (const url of uniqueCandidates) {
      try {
        // primary endpoint: try JSON first
        const result = await tryJsonPost(url);
        await this.setStoredToken(result.token);
        // Capture device info after successful login and persist locally so
        // we can attach it to later requests (attendance, audit, etc.). This
        // is non-blocking for the login flow but helpful for server-side
        // device tracking.
        try {
          await this.getDeviceInfo();
        } catch (e) {
          console.debug('[api] failed to capture device info', e);
        }
        return result;
      } catch (err) {
        lastError = err;
        // if this is the first candidate, try form-encoded once
        if (url === uniqueCandidates[0]) {
          try {
            const result = await tryFormPost(url);
            await this.setStoredToken(result.token);
            return result;
          } catch (err2) {
            lastError = err2;
          }
        }
        // otherwise continue to next candidate
      }
    }

    // all attempts failed
    throw lastError || new Error('Login failed (no response)');

  }

  /**
   * Capture device information using Capacitor Device plugin when available,
   * and fall back to navigator.userAgent/platform on web. The snapshot is
   * persisted to Preferences under `device_info` so other flows (attendance,
   * reporting) can include the same descriptor.
   */
  async getDeviceInfo(): Promise<Record<string, any>> {
    // Try to dynamically load the Capacitor Device plugin. Doing this at
    // runtime avoids TypeScript compile errors if the package isn't present in
    // the web-only environment or types aren't installed.
    let DevicePlugin: any = null;
    try {
      // Dynamic import the Capacitor Device plugin if available. Use @ts-ignore
      // to avoid compile-time errors when the package/type declarations aren't
      // present in the environment.
      // @ts-ignore
      const mod = await import('@capacitor/device');
      DevicePlugin = mod?.Device ?? null;
    } catch (e) {
      DevicePlugin = null;
    }

    if (DevicePlugin) {
      try {
        const info = await DevicePlugin.getInfo();
        // Device.getId() may not be available on all platforms; try but don't fail
        let id: string | null = null;
        try {
          const idResp = await DevicePlugin.getId?.();
          if (idResp && idResp.uuid) id = idResp.uuid;
        } catch (e) {
          // ignore
        }

        const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
        const device = {
          model: (info as any).model || null,
          manufacturer: (info as any).manufacturer || null,
          platform: (info as any).platform || null,
          osVersion: (info as any).osVersion || null,
          appVersion: (info as any).appVersion || null,
          isVirtual: (info as any).isVirtual || false,
          uuid: id,
          userAgent: ua,
        };
        await Preferences.set({ key: 'device_info', value: JSON.stringify(device) });
        return device;
      } catch (e) {
        // fall through to web fallback
      }
    }

    // Fallback for web or when Device plugin isn't available
    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
    const fallback = { userAgent: ua, platform: (typeof navigator !== 'undefined' ? navigator.platform : 'web') };
    await Preferences.set({ key: 'device_info', value: JSON.stringify(fallback) });
    return fallback;
  }

  async logout(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/auth/logout`, {
      method: 'POST',
      headers: await this.getHeaders()
    });

    await this.handleResponse<{ message: string }>(response);
    await this.clearStoredToken();
  }

  // Attendance endpoints
  async reportAttendance(data: AttendancePayload): Promise<{ message: string }> {
    try {
      // Ensure we have a valid token before proceeding
      const token = await this.getStoredToken();
      if (!token) {
        const error = new Error('No authentication token available. Please log in again.');
        (error as any).status = 401; // Unauthorized
        throw error;
      }

      // Prepare the request URL
      const url = `${this.baseUrl}/attendance/report`;
      
      // Prepare headers with authentication
      const headers = await this.getHeaders();
      
      // Create the request body
      const requestBody = {
        ...data,
        // Add any additional metadata that might be required by the server
        clientTimestamp: new Date().toISOString(),
        clientVersion: '1.0.0' // You can get this from package.json or config
      };

      console.log('Sending attendance report:', { 
        url,
        method: 'POST',
        headers,
        body: requestBody
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody),
        credentials: 'include' // Include cookies if needed for session-based auth
      });

      // Log response details for debugging
      const responseText = await response.text();
      console.log('Attendance report response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText
      });

      // Handle non-2xx responses
      if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use the raw text as the error message
          if (responseText) {
            errorMessage = `${errorMessage}: ${responseText}`;
          }
        }
        
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        (error as any).response = response;
        throw error;
      }

      // Parse and return the successful response
      try {
        return JSON.parse(responseText);
      } catch (e) {
        console.warn('Failed to parse JSON response, returning raw text');
        return { message: responseText };
      }
    } catch (error: unknown) {
      // Type guard to check if error is an instance of Error
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unknown error occurred';
      
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      console.error('Error in reportAttendance:', {
        error,
        message: errorMessage,
        stack: errorStack
      });
      
      // Create a new error with the proper type
      const typedError = new Error(errorMessage) as Error & { status?: number };
      typedError.stack = errorStack;
      
      // Preserve the status if it exists
      if (error && typeof error === 'object' && 'status' in error) {
        typedError.status = error.status as number;
      } else {
        typedError.status = 500; // Default to Internal Server Error
      }
      
      throw typedError;
    }
  }

  async getAttendanceHistory(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/attendance/history`, {
      headers: await this.getHeaders()
    });

    return this.handleResponse<any[]>(response);
  }

  // User profile endpoints
  async getUserProfile(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/user/profile`, {
      headers: await this.getHeaders()
    });

    return this.handleResponse<any>(response);
  }

  async updateUserProfile(data: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/user/profile`, {
      method: 'PUT',
      headers: await this.getHeaders(),
      body: JSON.stringify(data)
    });

    return this.handleResponse<any>(response);
  }

  // Dashboard endpoints
  async getDashboardData(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/dashboard`, {
      headers: await this.getHeaders()
    });

    return this.handleResponse<any>(response);
  }

  // Error handling wrapper
  async makeRequest<T>(request: () => Promise<T>): Promise<T> {
    try {
      return await request();
    } catch (error: any) {
      if (error.message === 'Unauthorized' || error.message === 'Token expired') {
        await this.clearStoredToken();
        // You might want to redirect to login here or handle token expiration
      }
      throw error;
    }
  }
}

// Create and export a singleton instance
// When running the app locally in the browser, prefer the relative `/api` base so
// Vite's dev server proxy handles requests and avoids CORS/preflight redirect issues.
const _devBase = (typeof window !== 'undefined' && window.location.hostname.includes('localhost')) ? '/api' : undefined;
export const apiService = new ApiService(_devBase);

// Export the class for testing purposes
export type { LoginResponse, AttendancePayload };
export { ApiService };
