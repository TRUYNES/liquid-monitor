import axios from 'axios';

// Replace with your local IP if this changes
const API_URL = 'https://data.noktafikir.com';

const api = axios.create({
    baseURL: API_URL,
    timeout: 5000,
});

export const getStats = async () => {
    try {
        const response = await api.get('/api/stats/current');
        return response.data;
    } catch (error) {
        console.error('Error fetching stats:', error);
        return null;
    }
};

export const getPeaks = async () => {
    try {
        const response = await api.get('/api/stats/peaks');
        return response.data;
    } catch (error) {
        console.error('Error fetching peaks:', error);
        return null;
    }
};

export const getContainers = async () => {
    try {
        const response = await api.get('/api/containers');
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
