import type { LoginResponse, VodCategory } from '../types/shared.types';

export const apiService = {
    /**
     * Authenticates the user with the Xtream Codes server.
     */
    async login(username: string, password: string, baseUrl: string): Promise<LoginResponse> {
        const url = apiService.normalizeUrl(baseUrl);
        const apiUrl = `${url}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data: LoginResponse = await response.json();

        // XC API returns 200 even for auth failure, we check auth field
        if (data.user_info.auth !== 1) {
            throw new Error(data.user_info.message || 'Authentication Failed');
        }

        return data;
    },

    /**
     * Fetches the list of VOD (Movie) Categories.
     */
    async getVodCategories(username: string, password: string, baseUrl: string): Promise<VodCategory[]> {
        const url = apiService.normalizeUrl(baseUrl);
        const apiUrl = `${url}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_vod_categories`;

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to fetch VOD categories');
        const data: VodCategory[] = await response.json();

        // Sort: Move "Telugu" categories to the top, keep original order otherwise
        return data.sort((a, b) => {
            const aHasTelugu = a.category_name.toLowerCase().includes('telugu');
            const bHasTelugu = b.category_name.toLowerCase().includes('telugu');

            if (aHasTelugu && !bHasTelugu) return -1;
            if (!aHasTelugu && bHasTelugu) return 1;
            return 0;
        });
    },

    /**
     * Fetches the list of Series Categories.
     */
    async getSeriesCategories(username: string, password: string, baseUrl: string): Promise<any[]> { // TODO: Define SeriesCategory type
        const url = apiService.normalizeUrl(baseUrl);
        const apiUrl = `${url}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_series_categories`;

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to fetch Series categories');
        return await response.json();
    },

    /**
     * Fetches VOD streams for a specific category.
     */
    async getVodStreams(username: string, password: string, baseUrl: string, categoryId: string): Promise<any[]> {
        const url = apiService.normalizeUrl(baseUrl);
        const apiUrl = `${url}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_vod_streams&category_id=${categoryId}`;

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to fetch VOD streams');
        return await response.json();
    },

    /**
     * Fetches ALL VOD streams (no category filter) - single API call
     */
    async getAllVodStreams(username: string, password: string, baseUrl: string): Promise<any[]> {
        const url = apiService.normalizeUrl(baseUrl);
        const apiUrl = `${url}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_vod_streams`;

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to fetch all VOD streams');
        return await response.json();
    },

    /**
     * Fetches detailed info for a specific VOD.
     */
    async getVodInfo(username: string, password: string, baseUrl: string, vodId: string | number): Promise<any> {
        const url = apiService.normalizeUrl(baseUrl);
        const apiUrl = `${url}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_vod_info&vod_id=${vodId}`;

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to fetch VOD info');
        return await response.json();
    },

    /**
     * Fetches Series streams for a specific category.
     */
    async getSeriesStreams(username: string, password: string, baseUrl: string, categoryId: string): Promise<any[]> {
        const url = apiService.normalizeUrl(baseUrl);
        const apiUrl = `${url}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_series&category_id=${categoryId}`;

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to fetch Series streams');
        return await response.json();
    },

    /**
     * Fetches ALL Series streams (no category filter) - single API call
     */
    async getAllSeriesStreams(username: string, password: string, baseUrl: string): Promise<any[]> {
        const url = apiService.normalizeUrl(baseUrl);
        const apiUrl = `${url}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_series`;

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to fetch all Series streams');
        return await response.json();
    },

    /**
     * Fetches detailed info for a specific Series (seasons and episodes).
     */
    async getSeriesInfo(username: string, password: string, baseUrl: string, seriesId: string | number): Promise<any> {
        const url = apiService.normalizeUrl(baseUrl);
        const apiUrl = `${url}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_series_info&series_id=${seriesId}`;

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to fetch Series info');
        return await response.json();
    },

    // --- Live TV Methods ---

    /**
     * Fetches the list of Live TV Categories.
     */
    async getLiveCategories(username: string, password: string, baseUrl: string): Promise<any[]> {
        const url = apiService.normalizeUrl(baseUrl);
        const apiUrl = `${url}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_live_categories`;

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to fetch Live categories');
        return await response.json();
    },

    /**
     * Fetches Live streams for a specific category.
     */
    async getLiveStreams(username: string, password: string, baseUrl: string, categoryId: string): Promise<any[]> {
        const url = apiService.normalizeUrl(baseUrl);
        const apiUrl = `${url}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_live_streams&category_id=${categoryId}`;

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to fetch Live streams');
        return await response.json();
    },

    /**
     * Fetches ALL Live streams (no category filter) - single API call
     */
    async getAllLiveStreams(username: string, password: string, baseUrl: string): Promise<any[]> {
        const url = apiService.normalizeUrl(baseUrl);
        const apiUrl = `${url}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_live_streams`;

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to fetch all Live streams');
        return await response.json();
    },

    /**
     * Helper to normalize the URL input
     */
    normalizeUrl(inputUrl: string): string {
        let url = inputUrl.trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = `http://${url}`;
        }
        if (url.endsWith('/')) {
            url = url.slice(0, -1);
        }
        return url;
    }
};


