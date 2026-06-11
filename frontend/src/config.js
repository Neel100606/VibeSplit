import axios from 'axios';
import { io } from 'socket.io-client';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const API_URL = `${API_BASE_URL}/api`;

// Pre-configured Axios instance
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Automatically inject authorization header if token exists in localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('vibesplit_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Global socket instance using native WebSockets only to bypass Render sticky sessions issues
export const socket = io(API_BASE_URL, {
  transports: ['websocket'],
  autoConnect: true,
});
