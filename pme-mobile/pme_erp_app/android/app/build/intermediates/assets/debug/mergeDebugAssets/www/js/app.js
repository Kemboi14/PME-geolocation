import { getToken, removeToken } from './storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  const token = await getToken();

  if (!token) {
    // If no token is found, redirect to the login page
    window.location.replace('index.html');
    return;
  }

  // Add event listener for the logout button
  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      await removeToken();
      window.location.href = 'index.html';
    });
  }
});
