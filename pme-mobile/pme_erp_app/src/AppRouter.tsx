import React, { useState, useEffect } from 'react';
import { IonRouterOutlet, IonLoading, IonApp } from '@ionic/react';
import { Route, Redirect, useHistory } from 'react-router-dom'; // Removed IonReactRouter
import { Preferences } from '@capacitor/preferences';
import LoginScreen from './LoginScreen';
import LandingPage from './LandingPage';
import { apiService } from './services/api';

const AppRouter = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const history = useHistory();

  const checkAuth = async () => {
    try {
      const token = await apiService.getStoredToken();
      if (token) {
        setIsAuthenticated(true);
        // If authenticated, and currently on login or root, redirect to landing
        if (history.location.pathname === '/login' || history.location.pathname === '/') {
          history.replace('/landing');
        }
      } else {
        setIsAuthenticated(false);
        // If not authenticated, and not on login, redirect to login
        if (history.location.pathname !== '/login') {
          history.replace('/login');
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      // Ensure redirection to login on error if not already there
      if (history.location.pathname !== '/login') {
        history.replace('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, [history.location.pathname]); // Re-run checkAuth when the path changes

  // Handle route protection
  const ProtectedRoute = ({ component: Component, ...rest }: any) => {
    if (isLoading) {
      return <IonLoading isOpen={true} message="Loading..." />;
    }
    
    return (
      <Route
        {...rest}
        render={(props) =>
          isAuthenticated ? (
            <Component {...props} />
          ) : (
            <Redirect to="/login" />
          )
        }
      />
    );
  };

  if (isLoading) {
    return (
      <IonApp>
        <IonLoading isOpen={true} message="Loading..." />
      </IonApp>
    );
  }

  return (
    <IonRouterOutlet>
      <Route exact path="/login" component={LoginScreen} />
      <ProtectedRoute exact path="/landing" component={LandingPage} />
      <Route exact path="/">
        <Redirect to={isAuthenticated ? "/landing" : "/login"} />
      </Route>
    </IonRouterOutlet>
  );
};

export default AppRouter;
