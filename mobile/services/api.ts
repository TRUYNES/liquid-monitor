import axios from 'axios';

// Default URL (can be overwritten)
const DEFAULT_API_URL = 'https://data.noktafikir.com';

const api = axios.create({
    baseURL: DEFAULT_API_URL,
    timeout: 5000,
});

export const setApiBaseUrl = (url: string) => {
    // Ensure no trailing slash
    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    api.defaults.baseURL = cleanUrl;
    console.log('API Base URL set to:', cleanUrl);
};

export const getStats = async () => {
    try {
        const response = await api.get('/api/stats/current');
        // Check if response is HTML (likely Cloudflare Access or other auth wall)
        if (typeof response.data === 'string' && response.data.trim().startsWith('<!DOCTYPE html>')) {
            console.error('Cloudflare Access or Auth Wall detected');
            return { error: 'AUTH_REQUIRED' };
        }

        // Simple validation: check if critical keys exist
        if (!response.data || typeof response.data !== 'object' || response.data.cpu_usage === undefined) {
            console.error('Invalid stats data received:', response.data);
            return null;
        }
        return response.data;
    } catch (error) {
        console.error('Error fetching stats:', error);
        return null;
    }
};

export const getPeaks = async () => {
    try {
        const response = await api.get('/api/stats/peaks');
        if (!response.data || typeof response.data !== 'object') {
            return null;
        }
        return response.data;
    } catch (error) {
        console.error('Error fetching peaks:', error);
        return null;
    }
};

export const getContainers = async () => {
    try {
        const response = await api.get('/api/containers');
        if (!Array.isArray(response.data)) {
            return [];
        }
        return response.data;
    } catch (error) {
        console.error('Error fetching containers:', error);
        return [];
    }
};

export const getHistory = async () => {
    try {
        const response = await api.get('/api/stats/history');
        const data = response.data;
        if (!Array.isArray(data)) return [];

        // Sample down to ~12 points for the chart for performance
        const step = Math.ceil(data.length / 12) || 1;
        const sampled = [];
        for (let i = 0; i < data.length; i += step) {
            sampled.push(data[i]);
        }
        return sampled;
    } catch (error) {
        console.error('Error fetching history:', error);
        return [];
    }
};

export default api;
