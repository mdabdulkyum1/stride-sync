import axios from 'axios';
import { AuthService } from './../modules/auth/authService';

const authService = AuthService.getInstance();

export const stravaApi = axios.create({
  baseURL: 'https://www.strava.com/api/v3',
});

// Middleware to add dynamic token to requests
stravaApi.interceptors.request.use(async (config) => {
  await authService.refreshTokenIfNeeded();
  const token = authService.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));