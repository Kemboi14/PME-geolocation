import { Storage } from '@capacitor/storage';

const AUTH_TOKEN_KEY = 'auth_token';

/**
 * Saves the authentication token to secure storage.
 * @param {string} token The JWT to save.
 * @returns {Promise<void>}
 */
export const saveToken = async (token) => {
  await Storage.set({
    key: AUTH_TOKEN_KEY,
    value: token,
  });
};

/**
 * Retrieves the authentication token from secure storage.
 * @returns {Promise<string|null>} The stored token, or null if not found.
 */
export const getToken = async () => {
  const { value } = await Storage.get({ key: AUTH_TOKEN_KEY });
  return value;
};

/**
 * Removes the authentication token from secure storage.
 * @returns {Promise<void>}
 */
export const removeToken = async () => {
  await Storage.remove({ key: AUTH_TOKEN_KEY });
};
