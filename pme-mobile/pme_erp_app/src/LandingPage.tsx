import React, { useEffect, useState } from 'react';
import {
  IonContent,
  IonPage,
  IonButton,
  IonSpinner,
  IonText,
  IonIcon,
  useIonRouter,
} from '@ionic/react';
import { Geolocation } from '@capacitor/geolocation';
import { Browser } from '@capacitor/browser';
import { Dialog } from '@capacitor/dialog';
import { Preferences } from '@capacitor/preferences';
import { checkmarkCircle, openOutline } from 'ionicons/icons';
import { apiService } from './services/api';
import './LandingPage.css';

interface DeviceInfo {
  platform?: string;
  operatingSystem?: string;
  osVersion?: string;
  model?: string;
  manufacturer?: string;
  deviceId?: string;
  isVirtual?: boolean;
  timestamp?: string;
  error?: string;
}

export default function LandingPage() {
  const [userData, setUserData] = useState<{ 
    username: string; 
    serverUrl: string; 
    redirectUrl?: string | null;
    deviceInfo?: DeviceInfo;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationInfo, setLocationInfo] = useState<{
    latitude: number;
    longitude: number;
    city: string;
    country: string;
    time: string;
  } | null>(null);
  const [reported, setReported] = useState(false);
  const [debugToken, setDebugToken] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  
  const router = useIonRouter();

  const formatTime = (date: Date): string => {
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const reverseGeocode = async (lat: number, lon: number) => {
    // Helper function to extract location details from address components
    const extractLocationInfo = (addressComponents: any[]) => {
      let city = '';
      let town = '';
      let village = '';
      let country = '';
      let displayName = '';

      for (const component of addressComponents) {
        const types = component.types;
        const value = component.long_name || '';
        
        if (types.includes('locality')) {
          city = value;
        } else if (types.includes('administrative_area_level_2')) {
          town = value;
        } else if (types.includes('village')) {
          village = value;
        } else if (types.includes('country')) {
          country = value;
        }
      }

      // Try to get the most specific location name available
      displayName = city || town || village || 'Current Location';
      
      return {
        city: displayName,
        country: country || 'Unknown Area',
        displayName: `${displayName}${country ? `, ${country}` : ''}`
      };
    };

    // Method 1: Try OpenStreetMap Nominatim (no API key required)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'PME-ERP-App/1.0 (your-email@example.com)'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.address) {
          const { city, town, village, country } = data.address;
          const displayName = [
            data.address.road,
            data.address.suburb,
            data.address.city_district || data.address.town || data.address.village,
            data.address.state || data.address.country
          ].filter(Boolean).join(', ');

          return {
            city: city || town || village || 'Current Location',
            country: country || data.address.country || 'Unknown Area',
            displayName: displayName || 'Current Location'
          };
        }
      }
    } catch (error) {
      console.log('OpenStreetMap geocoding failed, trying next method...');
    }

    // Method 2: Try browser's built-in geolocation API
    try {
      if ('geolocation' in navigator) {
        // This will use the browser's built-in geocoding if available
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&result_type=locality|sublocality&key=YOUR_GOOGLE_MAPS_API_KEY`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            const address = data.results[0];
            const components = address.address_components || [];
            return extractLocationInfo(components);
          }
        }
      }
    } catch (error) {
      console.log('Browser geocoding failed, trying next method...');
    }

    // Method 3: Try server-side geocoding
    try {
      const response = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lon}`);
      if (response.ok) {
        const data = await response.json();
        if (data) {
          return {
            city: data.city || data.town || data.village || 'Current Location',
            country: data.country || 'Unknown Area',
            displayName: data.display_name || data.formatted_address || 'Current Location'
          };
        }
      }
    } catch (error) {
      console.error('Server-side geocoding failed, trying next method...');
    }

    // Method 4: Fallback to coordinates if all else fails
    try {
      // Try to get at least the country using the reverse geocoding API
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data) {
          return {
            city: data.city || data.locality || 'Current Location',
            country: data.countryName || 'Unknown Area',
            displayName: [data.city, data.locality, data.countryName].filter(Boolean).join(', ') || 'Current Location'
          };
        }
      }
    } catch (error) {
      console.error('Fallback geocoding failed:', error);
    }

    // Final fallback - return coordinates
    return { 
      city: `Lat: ${lat.toFixed(4)}`, 
      country: `Lon: ${lon.toFixed(4)}`,
      displayName: `Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
      error: 'Could not determine location name'
    };
  };

  const reportAttendance = async (locationData: typeof locationInfo) => {
    if (!locationData) return;

    try {
      // Ensure we have a valid token
      const token = await Preferences.get({ key: 'auth_token' });
      if (!token.value) {
        throw new Error('No authentication token found. Please log in again.');
      }

      // Add a timestamp to the request
      const timestamp = new Date().toISOString();
      
      // Prepare the attendance data
      const attendanceData = {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        city: locationData.city,
        country: locationData.country,
        reportTime: timestamp,
        // Add any additional required fields here
      };

      // Log the request for debugging
      console.log('Sending attendance report:', attendanceData);

      // Make the API call
      await apiService.reportAttendance(attendanceData);
      
      // Update UI to show success
      setReported(true);
      await Dialog.alert({ 
        title: 'Success', 
        message: `Attendance reported at ${formatTime(new Date(timestamp))}`
      });
    } catch (error: any) {
      console.error('Error reporting attendance:', error);
      
      // Handle specific error cases
      if (error.status === 403) {
        await Dialog.alert({
          title: 'Session Expired',
          message: 'Your session has expired. Please log in again.',
          buttons: ['OK']
        });
        // Redirect to login
        router.push('/login', 'root', 'replace');
        return;
      }
      
      // Show a user-friendly error message
      const errorMessage = error.message || 'Failed to report attendance. Please try again.';
      setLastError(errorMessage);
      await Dialog.alert({
        title: 'Error',
        message: errorMessage,
        buttons: ['OK']
      });
    }
  };

  // Centralized flow for obtaining location and reporting attendance so it can be
  // triggered on mount and manually by the user.
  const fetchAndReport = async () => {
    setLoading(true);
    setReported(false);
    setLastError(null);
    
    try {
      let coords: { latitude: number; longitude: number };
      
      // First try Capacitor Geolocation if available
      try {
        // Check and request permissions
        const permissionStatus = await Geolocation.checkPermissions();
        if (permissionStatus.location === 'prompt') {
          await Geolocation.requestPermissions();
        }
        
        const after = await Geolocation.checkPermissions();
        if (after.location === 'denied') {
          throw new Error('Location permission denied');
        }
        
        // Get position with high accuracy
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000
        });
        
        coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
      } catch (capacitorError) {
        console.log('Capacitor geolocation failed, falling back to browser geolocation');
        
        // Fallback to browser geolocation
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            (error) => reject(error),
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            }
          );
        });
        
        coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
      }
      
      // Get location info (city, country)
      const locationInfo = await reverseGeocode(coords.latitude, coords.longitude);
      
      // If we couldn't determine location, use coordinates as fallback
      if (locationInfo.error) {
        console.warn('Could not get location name, using coordinates');
        locationInfo.city = `Lat: ${coords.latitude.toFixed(4)}`;
        locationInfo.country = `Lon: ${coords.longitude.toFixed(4)}`;
      }
      
      // Create location data object
      const locationData = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        city: locationInfo.city,
        country: locationInfo.country,
        time: formatTime(new Date())
      };
      
      // Update UI with location info
      setLocationInfo(locationData);
      
      // Report attendance with the location data
      await reportAttendance(locationData);
      
      setReported(true);
    } catch (error) {
      console.error('Error in fetchAndReport:', error);
      
      // Handle different types of errors
      if (error instanceof GeolocationPositionError || (error as any).code) {
        const errorCode = (error as GeolocationPositionError).code;
        switch (errorCode) {
          case 1: // PERMISSION_DENIED
            setLastError('Location access was denied. Please enable location services in your device settings and try again.');
            break;
          case 2: // POSITION_UNAVAILABLE
            setLastError('Location information is unavailable. Please check your connection and try again.');
            break;
          case 3: // TIMEOUT
            setLastError('Location request timed out. Please try again in an area with better GPS reception.');
            break;
          default:
            setLastError('Could not get your location. Please try again.');
        }
      } else if (error instanceof Error) {
        setLastError(error.message || 'An unexpected error occurred. Please try again.');
      } else {
        setLastError('An unknown error occurred. Please try again.');
      }
      
      // Show error to user
      await Dialog.alert({
        title: 'Error',
        message: lastError || 'An unknown error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  const openERPDashboard = async () => {
    if (!userData) return;
    // Prefer the redirect URL returned by the login endpoint (this usually
    // contains a tokenized login link that opens the dashboard directly).
    const base = userData.serverUrl.replace(/\/+$/, '');
    const dashboardUrl = userData.redirectUrl
      || `${base}/public/dashboard`
      || base;

    await Browser.open({
      url: dashboardUrl,
      presentationStyle: 'fullscreen'
    });
  };

  // Check authentication and load user data
  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        // Check if we have an auth token
        const token = await apiService.getStoredToken();
        if (!token) {
          console.log('No auth token found, redirecting to login');
          router.push('/login');
          return;
        }
        
        // Load user data if we have a token
        const { value } = await Preferences.get({ key: 'user_data' });
        if (value) {
          setUserData(JSON.parse(value));
          setDebugToken(token);
        } else {
          // If no user data but we have a token, something's wrong - log out
          console.log('User data not found, logging out');
          await apiService.logout();
          router.push('/login');
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        // On error, redirect to login to be safe
        router.push('/login');
      }
    };
    
    checkAuthAndLoadData();
  }, [router]);

  useEffect(() => {
    if (!userData) return;
    // automatically try to fetch and report once when landing page loads
    fetchAndReport();
  }, [userData]);

  return (
    <IonPage>
      <IonContent className="landing-content">
        <div className="landing-container">
          {loading ? (
            <div className="loading-container">
              <IonSpinner name="circular" className="loading-spinner" />
              <IonText color="light">Getting your location...</IonText>
            </div>
          ) : locationInfo && userData ? (
            <div className="success-container">
              <IonIcon icon={checkmarkCircle} className="success-icon" />
              <div className="welcome-message">
                <h1>Welcome, {userData.username}!</h1>
                <p>You are logged in to {userData.serverUrl}</p>
                
                {userData.deviceInfo && (
                  <div className="device-info">
                    <h3>Device Information</h3>
                    <p><strong>Platform:</strong> {userData.deviceInfo.platform || 'N/A'}</p>
                    <p><strong>OS:</strong> {userData.deviceInfo.operatingSystem || 'N/A'} {userData.deviceInfo.osVersion || ''}</p>
                    <p><strong>Device:</strong> {userData.deviceInfo.manufacturer || ''} {userData.deviceInfo.model || 'N/A'}</p>
                    <p><strong>Device ID:</strong> {userData.deviceInfo.deviceId || 'N/A'}</p>
                    <p><small>Last updated: {new Date(userData.deviceInfo.timestamp || '').toLocaleString()}</small></p>
                  </div>
                )}
              </div>
              <IonText className="success-message">
                {userData?.username} reported to work at {locationInfo.time} from{' '}
                {locationInfo.city}, {locationInfo.country}
              </IonText>
              
              <div className="coordinates-container">
                <IonText className="coordinates-text">
                  📍 {locationInfo.latitude.toFixed(6)}, {locationInfo.longitude.toFixed(6)}
                </IonText>
              </div>

              <IonButton
                expand="block"
                className="continue-button"
                onClick={openERPDashboard}
              >
                Continue to ERP Dashboard
                <IonIcon slot="end" icon={openOutline} />
              </IonButton>
              {/* Manual reporting removed: reporting is automatic on page load */}

              {/* Debug info: show base URL and masked token when available */}
              <div style={{ marginTop: 12 }}>
                <IonText style={{ fontSize: 12, color: '#ccc' }}>
                  Base: {userData?.serverUrl}
                </IonText>
                <br />
                <IonText style={{ fontSize: 12, color: '#ccc' }}>
                  Token: {debugToken ? `${debugToken.substring(0, 8)}...${debugToken.substring(debugToken.length - 8)}` : 'none'}
                </IonText>
                {lastError && (
                  <div style={{ marginTop: 8 }}>
                    <IonText color="danger" style={{ fontSize: 12 }}>
                      Last error: {lastError}
                    </IonText>
                  </div>
                )}
              </div>
            </div>
          ) : userData ? (
            <div className="error-container">
              <IonText color="light">
                Unable to get location. Please check your settings and try again.
              </IonText>
              <IonButton
                expand="block"
                className="retry-button"
                onClick={() => window.location.reload()}
              >
                Retry
              </IonButton>
            </div>
          ) : (
            <div className="loading-container">
              <IonSpinner name="circular" className="loading-spinner" />
              <IonText color="light">Loading...</IonText>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}