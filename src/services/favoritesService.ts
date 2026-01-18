
import type { FavoriteMovie } from '../types/shared.types';

const STORAGE_KEY = 'favorites_vod';

export const favoritesService = {
    getFavorites(): FavoriteMovie[] {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Failed to parse favorites', e);
            return [];
        }
    },

    isFavorite(streamId: string | number): boolean {
        const favorites = this.getFavorites();
        return favorites.some(f => String(f.stream_id) === String(streamId));
    },

    addFavorite(movie: FavoriteMovie) {
        const favorites = this.getFavorites();
        if (!this.isFavorite(movie.stream_id)) {
            favorites.push(movie);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
        }
    },

    removeFavorite(streamId: string | number) {
        let favorites = this.getFavorites();
        favorites = favorites.filter(f => String(f.stream_id) !== String(streamId));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    },

    toggleFavorite(movie: FavoriteMovie) {
        if (this.isFavorite(movie.stream_id)) {
            this.removeFavorite(movie.stream_id);
            return false; // Removed
        } else {
            this.addFavorite(movie);
            return true; // Added
        }
    },

    // --- Series Favorites ---
    getSeriesFavorites(): { series_id: number; name: string; cover?: string }[] {
        try {
            const stored = localStorage.getItem('favorites_series');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Failed to parse series favorites', e);
            return [];
        }
    },

    isSeriesFavorite(seriesId: number): boolean {
        const favorites = this.getSeriesFavorites();
        return favorites.some(f => f.series_id === seriesId);
    },

    addSeriesFavorite(series: { series_id: number; name: string; cover?: string }) {
        const favorites = this.getSeriesFavorites();
        if (!this.isSeriesFavorite(series.series_id)) {
            favorites.push(series);
            localStorage.setItem('favorites_series', JSON.stringify(favorites));
        }
    },

    removeSeriesFavorite(seriesId: number) {
        let favorites = this.getSeriesFavorites();
        favorites = favorites.filter(f => f.series_id !== seriesId);
        localStorage.setItem('favorites_series', JSON.stringify(favorites));
    },

    toggleSeriesFavorite(series: { series_id: number; name: string; cover?: string }) {
        if (this.isSeriesFavorite(series.series_id)) {
            this.removeSeriesFavorite(series.series_id);
            return false; // Removed
        } else {
            this.addSeriesFavorite(series);
            return true; // Added
        }
    }
};
