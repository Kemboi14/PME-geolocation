import { Http } from '@capacitor-community/http';

const API_BASE_URL = 'https://ke.erpproject.online/api';

/**
 * Attempts to log in a user with the provided credentials.
 * @param {string} email - The user's email address.
 * @param {string} password - The user's password.
 * @returns {Promise<string>} The authentication token if successful.
 * @throws {Error} If the login fails or the server returns an error.
 */
export const login = async (email, password) => {
  const options = {
    url: `${API_BASE_URL}/auth/login`,
    headers: { 'Content-Type': 'application/json' },
    data: { email, password },
  };

  const response = await Http.post(options);

  if (response.status !== 200 || !response.data || !response.data.token) {
    // Use the error message from the API if available, otherwise a generic one.
    const errorMessage = response.data?.message || 'Invalid credentials or server error.';
    throw new Error(errorMessage);
  }

  return response.data.token;
};
