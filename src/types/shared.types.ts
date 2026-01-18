// Profile Types
export type LoginData = {
    profileName: string;
    userName: string;
    password: string;
    url: string;
};

// API Types
export interface UserInfo {
    username: string;
    password: string;
    message: string;
    auth: number;
    status: string;
    exp_date: string;
    is_trial: string;
    active_cons: string;
    created_at: string;
    max_connections: string;
    allowed_output_formats: string[];
}

export interface ServerInfo {
    url: string;
    port: string;
    https_port: string;
    server_protocol: string;
    rtmp_port: string;
    timezone: string;
    timestamp_now: number;
    time_now: string;
    process: boolean; // true if process is OK
}

export interface LoginResponse {
    user_info: UserInfo;
    server_info: ServerInfo;
}

export interface VodCategory {
    category_id: string;
    category_name: string;
    parent_id: number;
}

export interface VodStream {
    num: number;
    stream_id: number;
    name: string;
    stream_type: string;
    stream_icon: string;
    rating: string;
    rating_5based: number;
    added: string;
    category_id: string;
    container_extension: string;
    custom_sid: string;
    direct_source: string;
}

export interface FavoriteMovie {
    stream_id: string | number;
    name: string;
    stream_icon?: string;
    container_extension?: string;
}

export interface WatchProgress {
    stream_id: string | number;
    name: string;
    stream_icon?: string;
    container_extension?: string;
    last_position: number; // in seconds
    duration: number; // total duration
    timestamp: number; // For sorting latest 40
    contentType?: 'movie' | 'series_episode' | 'live'; // To distinguish content types
    seriesId?: number; // For series episodes, store the parent series ID
    seasonNum?: number; // For series episodes
    episodeNum?: number; // For series episodes
}

// Series Types
export interface SeriesCategory {
    category_id: string;
    category_name: string;
    parent_id: number;
}

export interface SeriesStream {
    series_id: number;
    name: string;
    cover: string;
    plot: string;
    cast: string;
    director: string;
    genre: string;
    releaseDate: string;
    last_modified: string;
    rating: string;
    rating_5based: number;
    backdrop_path: string[];
    youtube_trailer: string;
    episode_run_time: string;
    category_id: string;
}

export interface Episode {
    id: string;
    episode_num: number;
    title: string;
    container_extension: string;
    info: {
        movie_image?: string;
        plot?: string;
        releasedate?: string;
        rating?: number;
        duration_secs?: number;
        duration?: string;
        bitrate?: number;
    };
}

export interface Season {
    season_number: number;
    name: string;
    episode_count: number;
    air_date: string;
    cover?: string;
    cover_big?: string;
}

export interface SeriesInfo {
    info: {
        name: string;
        cover: string;
        plot: string;
        cast: string;
        director: string;
        genre: string;
        releaseDate: string;
        rating: string;
        rating_5based: number;
        backdrop_path: string[];
        youtube_trailer: string;
        episode_run_time: string;
    };
    episodes: {
        [seasonNumber: string]: Episode[];
    };
    seasons: Season[];
}

export interface FavoriteSeries {
    series_id: number;
    name: string;
    cover?: string;
}

// Live TV Types
export interface LiveCategory {
    category_id: string;
    category_name: string;
    parent_id: number;
}

export interface LiveStream {
    num: number;
    name: string;
    stream_type: string;
    stream_id: number;
    stream_icon: string;
    epg_channel_id: string | null;
    added: string;
    category_id: string;
    custom_sid: string;
    tv_archive: number;
    direct_source: string;
    tv_archive_duration: number;
}
