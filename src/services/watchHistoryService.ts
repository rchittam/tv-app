import type { WatchProgress } from '../types/shared.types';

const STORAGE_KEY = 'react_iptv_watch_history';
const MAX_ITEMS = 40;

export const watchHistoryService = {
    getHistory: (): WatchProgress[] => {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error reading watch history', e);
            return [];
        }
    },

    saveProgress: (progress: Omit<WatchProgress, 'timestamp'>): void => {
        try {
            let history = watchHistoryService.getHistory();

            // Remove existing entry if it exists to update position
            history = history.filter(item => item.stream_id !== progress.stream_id);

            // Add new entry at the beginning
            const newEntry: WatchProgress = {
                ...progress,
                timestamp: Date.now()
            };

            history.unshift(newEntry);

            // Limit to 40 items
            if (history.length > MAX_ITEMS) {
                history = history.slice(0, MAX_ITEMS);
            }

            localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
            console.log(`[WatchHistory] Saved progress for ${progress.name} at ${progress.last_position}s`);
        } catch (e) {
            console.error('Error saving watch history', e);
        }
    },

    getProgress: (streamId: string | number): WatchProgress | undefined => {
        const history = watchHistoryService.getHistory();
        return history.find(item => item.stream_id === streamId);
    },

    removeHistory: (streamId: string | number): void => {
        try {
            let history = watchHistoryService.getHistory();
            history = history.filter(item => item.stream_id !== streamId);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        } catch (e) {
            console.error('Error removing history', e);
        }
    }
};
