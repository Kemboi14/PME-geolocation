import React, { useState } from 'react';
import { IonContent, IonPage, IonInput, IonIcon, IonButton, IonText, useIonRouter } from '@ionic/react';
import { earth, person, lockClosed } from 'ionicons/icons';
import { Dialog } from '@capacitor/dialog';
import { Preferences } from '@capacitor/preferences';
import { Device } from '@capacitor/device';
import { apiService } from './services/api';
import './LoginScreen.css';

export default function LoginScreen() {
  const [server, setServer] = useState('https://ke.erpproject.online');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useIonRouter();

  const showAlert = async (title: string, message: string) => {
    await Dialog.alert({
      title,
      message,
    });
  };

  const getDeviceInfo = async () => {
    try {
      const info = await Device.getInfo();
      const deviceId = await Device.getId();
      return {
        platform: info.platform,
        operatingSystem: info.operatingSystem,
        osVersion: info.osVersion,
        model: info.model,
        manufacturer: info.manufacturer,
        deviceId: deviceId.uuid,
        isVirtual: info.isVirtual,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting device info:', error);
      return {
        error: 'Could not retrieve device information',
        timestamp: new Date().toISOString()
      };
    }
  };

  const onLogin = async () => {
    // Basic validation
    if (!server.startsWith('https://')) {
      await showAlert('Invalid Server URL', 'Server URL must start with https://');
      return;
    }
    if (!email || !password) {
      await showAlert('Missing Credentials', 'Please enter your email and password');
      return;
    }

    try {
      // Set the API base URL
      const baseUrl = server.includes('erpproject.online') ? server + '/public' : server;
      apiService.setBaseUrl(baseUrl);
      
      // Attempt to login
      const response: any = await apiService.login(email, password);

      // Store the authentication token
      if (response && response.token) {
        await Preferences.set({ key: 'auth_token', value: response.token });
      } else if (response && response.data && response.data.token) {
        await Preferences.set({ key: 'auth_token', value: response.data.token });
      } else {
        throw new Error('No authentication token received');
      }

      // Determine a username to display
      let username = email;
      if (response && response.user && response.user.name) {
        username = response.user.name;
      } else if (response && response.data && response.data.user) {
        username = response.data.user.name || response.data.user.email || email;
      }

      // Get device information
      const deviceInfo = await getDeviceInfo();
      
      // Save user data for later use
      const userData = {
        username,
        serverUrl: server,
        email,
        lastLogin: new Date().toISOString(),
        deviceInfo
      };

      await Preferences.set({ 
        key: 'user_data', 
        value: JSON.stringify(userData) 
      });

      // Navigate to landing page using the router
      router.push('/landing', 'forward', 'replace');
      
    } catch (error: any) {
      // Ensure we log full structured error for debugging
      try {
        console.error('Login error (structured):', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      } catch (e) {
        console.error('Login error:', error);
      }

      // Compose a helpful message for debugging
      const statusInfo = error?.status ? ` (status ${error.status})` : '';
      const bodyInfo = error?.body ? `\nDetails: ${typeof error.body === 'string' ? error.body : JSON.stringify(error.body)}` : '';
      const message = error?.message || (typeof error === 'string' ? error : 'Failed to login. Please check your credentials and try again.');

      await showAlert(
        'Login Failed',
        `${message}${statusInfo}${bodyInfo}`
      );
    }
  };

  return (
    <IonPage>
      <IonContent className="login-content">
        <div className="gradient-background">
          <div className="login-container">
            {/* PME Logo */}
            <div className="logo-container">
              <IonText className="logo-text">PME</IonText>
            </div>

            {/* Form Section */}
            <div className="form-card">
              <div className="input-group">
                <IonText className="input-label">Server address</IonText>
                <div className="input-row">
                  <IonIcon icon={earth} className="input-icon" />
                  <IonInput
                    value={server}
                    onIonChange={e => setServer(e.detail.value!)}
                    className="custom-input"
                    type="text"
                  />
                </div>
              </div>

              <div className="input-group">
                <div className="input-row">
                  <IonIcon icon={person} className="input-icon" />
                  <IonInput
                    value={email}
                    onIonChange={e => setEmail(e.detail.value!)}
                    placeholder="Email/Username"
                    className="custom-input"
                    type="text"
                  />
                </div>
              </div>

              <div className="input-group">
                <div className="input-row">
                  <IonIcon icon={lockClosed} className="input-icon" />
                  <IonInput
                    value={password}
                    onIonChange={e => setPassword(e.detail.value!)}
                    placeholder="Password"
                    className="custom-input"
                    type="password"
                  />
                </div>
              </div>

              <IonButton
                expand="block"
                className="login-button"
                onClick={onLogin}
              >
                LOGIN
              </IonButton>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}