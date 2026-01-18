import { useEffect, useState } from 'react';
import { useFocusable, FocusContext, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { FocusableItem } from '../../components/FocusableItem';
import { FocusZone } from '../../components/FocusZone';
import { favoritesService } from '../../services/favoritesService';
import { watchHistoryService } from '../../services/watchHistoryService';
import { apiService } from '../../services/apiService';
import { SeriesDashboard } from '../series/components/SeriesDashboard';
import type { FavoriteMovie, FavoriteSeries, LoginData } from '../../types/shared.types';
import { useQuery } from '@tanstack/react-query';
import { ResumeModal } from '../../components/ResumeModal';
import '../movies/movies-explorer.css';
import './favorites.css';

interface Props {
    onBack: () => void;
    onPlay: (streamId: string | number, extension: string, name: string, streamIcon?: string, initialTime?: number) => void;
    credentials: LoginData;
}

type ActiveTab = 'movies' | 'series';

function FavoritesScene({ onBack, onPlay, credentials }: Props) {
    const { ref, focusKey, focusSelf } = useFocusable();
    const [activeTab, setActiveTab] = useState<ActiveTab>('movies');

    // Movie Favorites State
    const [movieFavorites, setMovieFavorites] = useState<FavoriteMovie[]>([]);
    const [selectedMovie, setSelectedMovie] = useState<FavoriteMovie | null>(null);
    const [showResumeModal, setShowResumeModal] = useState(false);

    // Series Favorites State
    const [seriesFavorites, setSeriesFavorites] = useState<FavoriteSeries[]>([]);
    const [selectedSeries, setSelectedSeries] = useState<FavoriteSeries | null>(null);

    useEffect(() => {
        focusSelf();
        setMovieFavorites(favoritesService.getFavorites());
        setSeriesFavorites(favoritesService.getSeriesFavorites());
    }, [focusSelf]);

    // Handle Back Button
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.keyCode === 10009 || e.key === 'Backspace' || e.key === 'Escape') {
                if (showResumeModal) {
                    setShowResumeModal(false);
                    setFocus('FAV_PLAY_BUTTON');
                } else {
                    onBack();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onBack, showResumeModal]);

    // Movie Details Query
    const { data: movieResponse } = useQuery({
        queryKey: ['vodInfo', selectedMovie?.stream_id],
        queryFn: () => {
            if (!selectedMovie?.stream_id || !credentials) return null;
            return apiService.getVodInfo(credentials.userName, credentials.password, credentials.url, selectedMovie.stream_id.toString());
        },
        enabled: !!selectedMovie?.stream_id && !!credentials,
        staleTime: 1000 * 60 * 30,
    });

    const info = movieResponse?.info;

    useEffect(() => {
        if (selectedMovie) {
            setTimeout(() => setFocus('FAV_PLAY_BUTTON'), 100);
        }
    }, [selectedMovie]);

    const handleRemoveMovieFavorite = () => {
        if (!selectedMovie) return;
        favoritesService.toggleFavorite(selectedMovie);
        const updated = favoritesService.getFavorites();
        setMovieFavorites(updated);
        setSelectedMovie(null);
        // Small delay to allow React to re-render the grid before refocusing
        setTimeout(() => {
            setFocus('FAVORITES_MOVIE_GRID');
        }, 50);
    };

    const handlePlayClick = () => {
        if (!selectedMovie) return;
        const history = watchHistoryService.getProgress(selectedMovie.stream_id);
        if (history && history.last_position > 0) {
            setShowResumeModal(true);
        } else {
            const extension = selectedMovie.container_extension || movieResponse?.movie_data?.container_extension || 'mp4';
            onPlay(selectedMovie.stream_id, extension, selectedMovie.name, selectedMovie.stream_icon);
        }
    };

    const handleTabChange = (tab: ActiveTab) => {
        setActiveTab(tab);
        setSelectedMovie(null);
        setSelectedSeries(null);
        // Refresh favorites when switching tabs
        if (tab === 'movies') {
            setMovieFavorites(favoritesService.getFavorites());
        } else {
            setSeriesFavorites(favoritesService.getSeriesFavorites());
        }
    };

    const handleSeriesDashboardBack = () => {
        if (selectedSeries) {
            setFocus(`fav-series-${selectedSeries.series_id}`);
        } else {
            setFocus('FAVORITES_SERIES_GRID');
        }
    };

    return (
        <FocusContext.Provider value={focusKey}>
            <div className="favorites-container" ref={ref}>

                {/* Tab Row */}
                <FocusZone className="favorites-tab-row" focusKeyParam="FAV_TABS">
                    <FocusableItem
                        focusKey="TAB_MOVIES"
                        onEnterPress={() => handleTabChange('movies')}
                    >
                        {(focused) => (
                            <button className={`favorites-tab ${focused ? 'focused' : ''} ${activeTab === 'movies' ? 'active' : ''}`}>
                                🎬 Movies ({movieFavorites.length})
                            </button>
                        )}
                    </FocusableItem>
                    <FocusableItem
                        focusKey="TAB_SERIES"
                        onEnterPress={() => handleTabChange('series')}
                    >
                        {(focused) => (
                            <button className={`favorites-tab ${focused ? 'focused' : ''} ${activeTab === 'series' ? 'active' : ''}`}>
                                📺 Series ({seriesFavorites.length})
                            </button>
                        )}
                    </FocusableItem>
                </FocusZone>

                {/* Content Area */}
                <div className="favorites-content">

                    {/* Movies Tab Content */}
                    {activeTab === 'movies' && (
                        <div className="favorites-movies-layout">
                            {/* Left Pane: Grid */}
                            <div className="favorites-grid-pane">
                                {movieFavorites.length === 0 ? (
                                    <div className="empty-state">
                                        <h2>No movie favorites yet</h2>
                                        <p>Go to Movies and add some!</p>
                                    </div>
                                ) : (
                                    <FocusZone
                                        className="movie-grid"
                                        focusKeyParam="FAVORITES_MOVIE_GRID"
                                        preferredChildFocusKey={selectedMovie ? `fav-movie-${selectedMovie.stream_id}` : undefined}
                                        style={{ flex: 1, overflowY: 'auto', alignContent: 'flex-start' }}
                                    >
                                        {movieFavorites.map((movie) => (
                                            <FocusableItem
                                                key={movie.stream_id}
                                                focusKey={`fav-movie-${movie.stream_id}`}
                                                onEnterPress={() => setSelectedMovie(movie)}
                                            >
                                                {(focused) => (
                                                    <div className={`movie-card ${focused ? 'focused' : ''}`}>
                                                        <div className="movie-poster-container">
                                                            {movie.stream_icon && (
                                                                <img
                                                                    src={movie.stream_icon}
                                                                    alt={movie.name}
                                                                    className="movie-poster"
                                                                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                                                                />
                                                            )}
                                                        </div>
                                                        <div className="movie-title">{movie.name}</div>
                                                    </div>
                                                )}
                                            </FocusableItem>
                                        ))}
                                    </FocusZone>
                                )}
                            </div>

                            {/* Right Pane: Details */}
                            <div className="movie-details-pane">
                                {selectedMovie ? (
                                    <FocusZone className="details-content" focusKeyParam="FAV_DETAILS_ZONE">
                                        <h2 className="details-title">{selectedMovie.name}</h2>

                                        {info ? (
                                            <>
                                                <div className="details-meta">
                                                    {info.rating && <span className="rating">⭐ {info.rating}</span>}
                                                    {info.releasedate && <span className="year">📅 {info.releasedate}</span>}
                                                </div>
                                                <p className="details-plot">{info.plot}</p>

                                                <div className="details-actions">
                                                    <FocusableItem
                                                        focusKey="FAV_PLAY_BUTTON"
                                                        onEnterPress={handlePlayClick}
                                                    >
                                                        {(focused) => (
                                                            <button className={`action-btn play-btn ${focused ? 'focused' : ''}`}>
                                                                {watchHistoryService.getProgress(selectedMovie.stream_id) ? '▶ Play / Continue' : '▶ Play'}
                                                            </button>
                                                        )}
                                                    </FocusableItem>

                                                    <FocusableItem onEnterPress={handleRemoveMovieFavorite}>
                                                        {(focused) => (
                                                            <button className={`action-btn fav-btn ${focused ? 'focused' : ''}`}>
                                                                ❤️ Remove
                                                            </button>
                                                        )}
                                                    </FocusableItem>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="details-placeholder">
                                                <p>Loading details...</p>
                                            </div>
                                        )}
                                    </FocusZone>
                                ) : (
                                    <div className="details-placeholder">
                                        Select a favorite to see details
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Series Tab Content */}
                    {activeTab === 'series' && (
                        <div className="favorites-series-layout">
                            {/* Left Pane: Series Grid */}
                            <div className="favorites-series-grid-pane">
                                {seriesFavorites.length === 0 ? (
                                    <div className="empty-state">
                                        <h2>No series favorites yet</h2>
                                        <p>Go to Series and add some!</p>
                                    </div>
                                ) : (
                                    <FocusZone
                                        className="series-grid"
                                        focusKeyParam="FAVORITES_SERIES_GRID"
                                        preferredChildFocusKey={selectedSeries ? `fav-series-${selectedSeries.series_id}` : undefined}
                                        style={{ flex: 1, overflowY: 'auto', alignContent: 'flex-start' }}
                                    >
                                        {seriesFavorites.map((series) => (
                                            <FocusableItem
                                                key={series.series_id}
                                                focusKey={`fav-series-${series.series_id}`}
                                                onEnterPress={() => setSelectedSeries(series)}
                                            >
                                                {(focused) => (
                                                    <div className={`series-card ${focused ? 'focused' : ''}`}>
                                                        <div className="series-poster-container">
                                                            {series.cover && (
                                                                <img
                                                                    src={series.cover}
                                                                    alt={series.name}
                                                                    className="series-poster"
                                                                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                                                                />
                                                            )}
                                                        </div>
                                                        <div className="series-title">{series.name}</div>
                                                    </div>
                                                )}
                                            </FocusableItem>
                                        ))}
                                    </FocusZone>
                                )}
                            </div>

                            {/* Right Pane: Series Dashboard */}
                            <SeriesDashboard
                                seriesId={selectedSeries?.series_id || null}
                                seriesName={selectedSeries?.name}
                                seriesCover={selectedSeries?.cover}
                                credentials={credentials}
                                onPlayEpisode={onPlay}
                                onBack={handleSeriesDashboardBack}
                                onFavoriteChange={(isFavorite) => {
                                    // Refresh the series favorites list
                                    const updated = favoritesService.getSeriesFavorites();
                                    setSeriesFavorites(updated);
                                    // If series was removed from favorites, clear selection
                                    if (!isFavorite) {
                                        setSelectedSeries(null);
                                        setTimeout(() => setFocus('FAVORITES_SERIES_GRID'), 50);
                                    }
                                }}
                            />
                        </div>
                    )}
                </div>

                {showResumeModal && selectedMovie && (
                    <ResumeModal
                        name={selectedMovie.name}
                        resumeTime={watchHistoryService.getProgress(selectedMovie.stream_id)?.last_position || 0}
                        onResume={() => {
                            setShowResumeModal(false);
                            const history = watchHistoryService.getProgress(selectedMovie.stream_id);
                            const extension = selectedMovie.container_extension || movieResponse?.movie_data?.container_extension || 'mp4';
                            onPlay(selectedMovie.stream_id, extension, selectedMovie.name, selectedMovie.stream_icon, history?.last_position);
                        }}
                        onStartOver={() => {
                            setShowResumeModal(false);
                            const extension = selectedMovie.container_extension || movieResponse?.movie_data?.container_extension || 'mp4';
                            onPlay(selectedMovie.stream_id, extension, selectedMovie.name, selectedMovie.stream_icon, 0);
                        }}
                        onCancel={() => {
                            setShowResumeModal(false);
                            setFocus('FAV_PLAY_BUTTON');
                        }}
                    />
                )}
            </div>
        </FocusContext.Provider>
    );
}

export default FavoritesScene;
