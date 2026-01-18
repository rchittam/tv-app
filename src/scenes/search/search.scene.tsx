import { useEffect, useState, useRef, useMemo } from 'react';
import { useFocusable, FocusContext, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { FocusableItem } from '../../components/FocusableItem';
import { FocusZone } from '../../components/FocusZone';
import { apiService } from '../../services/apiService';
import { favoritesService } from '../../services/favoritesService';
import { watchHistoryService } from '../../services/watchHistoryService';
import { SeriesDashboard } from '../series/components/SeriesDashboard';
import type { LoginData, VodStream, SeriesStream } from '../../types/shared.types';
import { useQuery } from '@tanstack/react-query';
import { ResumeModal } from '../../components/ResumeModal';
import '../movies/movies-explorer.css';
import '../favorites/favorites.css';
import './search.css';

interface Props {
    onBack: () => void;
    onPlay: (
        streamId: string | number,
        extension: string,
        name: string,
        streamIcon?: string,
        initialTime?: number,
        contentType?: 'movie' | 'series_episode',
        seriesId?: number,
        seasonNum?: number,
        episodeNum?: number
    ) => void;
    credentials: LoginData;
}

type ActiveTab = 'movies' | 'series';

const MIN_SEARCH_LENGTH = 3;

function SearchScene({ onBack, onPlay, credentials }: Props) {
    const { ref, focusKey, focusSelf } = useFocusable();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<ActiveTab>('movies');
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Movie state
    const [selectedMovie, setSelectedMovie] = useState<VodStream | null>(null);
    const [showResumeModal, setShowResumeModal] = useState(false);

    // Series state
    const [selectedSeries, setSelectedSeries] = useState<SeriesStream | null>(null);

    useEffect(() => {
        focusSelf();
    }, [focusSelf]);

    // Handle Back Button
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.keyCode === 10009 || e.key === 'Backspace' || e.key === 'Escape') {
                if (showResumeModal) {
                    setShowResumeModal(false);
                    setFocus('SEARCH_PLAY_BUTTON');
                } else {
                    onBack();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onBack, showResumeModal]);

    // Fetch ALL movies (cached) - single API call
    const { data: allMovies = [], isLoading: isLoadingMovies } = useQuery<VodStream[]>({
        queryKey: ['allVodStreams'],
        queryFn: () => {
            const { userName, password, url } = credentials;
            return apiService.getAllVodStreams(userName, password, url);
        },
        staleTime: 1000 * 60 * 30, // 30 minutes cache
        enabled: searchQuery.length >= MIN_SEARCH_LENGTH,
    });

    // Fetch ALL series (cached) - single API call
    const { data: allSeries = [], isLoading: isLoadingSeries } = useQuery<SeriesStream[]>({
        queryKey: ['allSeriesStreams'],
        queryFn: () => {
            const { userName, password, url } = credentials;
            return apiService.getAllSeriesStreams(userName, password, url);
        },
        staleTime: 1000 * 60 * 30,
        enabled: searchQuery.length >= MIN_SEARCH_LENGTH,
    });

    // Filter results based on search query
    const filteredMovies = useMemo(() => {
        if (searchQuery.length < MIN_SEARCH_LENGTH) return [];
        const query = searchQuery.toLowerCase();
        return allMovies.filter(m => m.name?.toLowerCase().includes(query));
    }, [allMovies, searchQuery]);

    const filteredSeries = useMemo(() => {
        if (searchQuery.length < MIN_SEARCH_LENGTH) return [];
        const query = searchQuery.toLowerCase();
        return allSeries.filter(s => s.name?.toLowerCase().includes(query));
    }, [allSeries, searchQuery]);

    // Fetch movie details for selected movie
    const { data: movieResponse } = useQuery({
        queryKey: ['vodInfo', selectedMovie?.stream_id],
        queryFn: () => {
            if (!selectedMovie?.stream_id) return null;
            return apiService.getVodInfo(credentials.userName, credentials.password, credentials.url, selectedMovie.stream_id.toString());
        },
        enabled: !!selectedMovie?.stream_id && activeTab === 'movies',
        staleTime: 1000 * 60 * 30,
    });

    const movieInfo = movieResponse?.info;
    const isFavorite = selectedMovie ? favoritesService.isFavorite(selectedMovie.stream_id) : false;

    useEffect(() => {
        if (selectedMovie) {
            setTimeout(() => setFocus('SEARCH_PLAY_BUTTON'), 100);
        }
    }, [selectedMovie]);

    const handleToggleFavorite = () => {
        if (!selectedMovie) return;
        favoritesService.toggleFavorite({
            stream_id: selectedMovie.stream_id,
            name: selectedMovie.name,
            stream_icon: selectedMovie.stream_icon,
            container_extension: selectedMovie.container_extension
        });
        // Force re-render
        setSelectedMovie({ ...selectedMovie });
    };

    const handlePlayMovie = () => {
        if (!selectedMovie) return;
        const history = watchHistoryService.getProgress(selectedMovie.stream_id);
        if (history && history.last_position > 0) {
            setShowResumeModal(true);
        } else {
            const extension = selectedMovie.container_extension || movieResponse?.movie_data?.container_extension || 'mp4';
            onPlay(selectedMovie.stream_id, extension, selectedMovie.name, selectedMovie.stream_icon, undefined, 'movie');
        }
    };

    const handleTabChange = (tab: ActiveTab) => {
        setActiveTab(tab);
        setSelectedMovie(null);
        setSelectedSeries(null);
    };

    const focusSearchInput = () => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        searchInputRef.current?.focus();
    };

    const handleSeriesDashboardBack = () => {
        if (selectedSeries) {
            setFocus(`search-series-${selectedSeries.series_id}`);
        } else {
            setFocus('SEARCH_SERIES_GRID');
        }
    };

    const isLoading = isLoadingMovies || isLoadingSeries;

    return (
        <FocusContext.Provider value={focusKey}>
            <div className="search-container" ref={ref}>

                {/* Search Input Row */}
                <div className="search-input-row">
                    <span className="search-icon">🔍</span>
                    <FocusableItem
                        focusKey="SEARCH_INPUT"
                        onEnterPress={focusSearchInput}
                        className="search-input-wrapper"
                    >
                        {(focused) => (
                            <input
                                ref={searchInputRef}
                                type="text"
                                className={`search-input ${focused ? 'focused' : ''}`}
                                placeholder="Search movies and series..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        )}
                    </FocusableItem>
                    <span className="search-hint">
                        {searchQuery.length < MIN_SEARCH_LENGTH
                            ? `Type at least ${MIN_SEARCH_LENGTH} characters`
                            : isLoading
                                ? 'Searching...'
                                : `${filteredMovies.length} movies, ${filteredSeries.length} series`}
                    </span>
                </div>

                {/* Tab Row */}
                <FocusZone className="favorites-tab-row" focusKeyParam="SEARCH_TABS">
                    <FocusableItem
                        focusKey="SEARCH_TAB_MOVIES"
                        onEnterPress={() => handleTabChange('movies')}
                    >
                        {(focused) => (
                            <button className={`favorites-tab ${focused ? 'focused' : ''} ${activeTab === 'movies' ? 'active' : ''}`}>
                                🎬 Movies ({filteredMovies.length})
                            </button>
                        )}
                    </FocusableItem>
                    <FocusableItem
                        focusKey="SEARCH_TAB_SERIES"
                        onEnterPress={() => handleTabChange('series')}
                    >
                        {(focused) => (
                            <button className={`favorites-tab ${focused ? 'focused' : ''} ${activeTab === 'series' ? 'active' : ''}`}>
                                📺 Series ({filteredSeries.length})
                            </button>
                        )}
                    </FocusableItem>
                </FocusZone>

                {/* Content Area */}
                <div className="search-content">

                    {/* Movies Tab */}
                    {activeTab === 'movies' && (
                        <div className="search-movies-layout">
                            {/* Left Pane: Grid */}
                            <div className="search-grid-pane">
                                {searchQuery.length < MIN_SEARCH_LENGTH ? (
                                    <div className="search-empty-state">
                                        <h2>Search for Movies</h2>
                                        <p>Enter at least {MIN_SEARCH_LENGTH} characters to search</p>
                                    </div>
                                ) : filteredMovies.length === 0 ? (
                                    <div className="search-empty-state">
                                        <h2>No movies found</h2>
                                        <p>Try a different search term</p>
                                    </div>
                                ) : (
                                    <FocusZone
                                        className="movie-grid"
                                        focusKeyParam="SEARCH_MOVIES_GRID"
                                        preferredChildFocusKey={selectedMovie ? `search-movie-${selectedMovie.stream_id}` : undefined}
                                        style={{ flex: 1, overflowY: 'auto', alignContent: 'flex-start' }}
                                    >
                                        {filteredMovies.slice(0, 100).map((movie) => (
                                            <FocusableItem
                                                key={movie.stream_id}
                                                focusKey={`search-movie-${movie.stream_id}`}
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
                                    <FocusZone className="details-content" focusKeyParam="SEARCH_MOVIE_DETAILS">
                                        <h2 className="details-title">{selectedMovie.name}</h2>

                                        {movieInfo ? (
                                            <>
                                                <div className="details-meta">
                                                    {movieInfo.rating && <span className="rating">⭐ {movieInfo.rating}</span>}
                                                    {movieInfo.releasedate && <span className="year">📅 {movieInfo.releasedate}</span>}
                                                </div>
                                                <p className="details-plot">{movieInfo.plot}</p>

                                                <div className="details-actions">
                                                    <FocusableItem
                                                        focusKey="SEARCH_PLAY_BUTTON"
                                                        onEnterPress={handlePlayMovie}
                                                    >
                                                        {(focused) => (
                                                            <button className={`action-btn play-btn ${focused ? 'focused' : ''}`}>
                                                                {watchHistoryService.getProgress(selectedMovie.stream_id) ? '▶ Play / Continue' : '▶ Play'}
                                                            </button>
                                                        )}
                                                    </FocusableItem>

                                                    <FocusableItem onEnterPress={handleToggleFavorite}>
                                                        {(focused) => (
                                                            <button className={`action-btn fav-btn ${focused ? 'focused' : ''}`}>
                                                                {isFavorite ? '❤️ Remove Favorite' : '🤍 Add to Favorites'}
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
                                        Select a movie to see details
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Series Tab */}
                    {activeTab === 'series' && (
                        <div className="search-series-layout">
                            {/* Left Pane: Series Grid */}
                            <div className="search-series-grid-pane">
                                {searchQuery.length < MIN_SEARCH_LENGTH ? (
                                    <div className="search-empty-state">
                                        <h2>Search for Series</h2>
                                        <p>Enter at least {MIN_SEARCH_LENGTH} characters to search</p>
                                    </div>
                                ) : filteredSeries.length === 0 ? (
                                    <div className="search-empty-state">
                                        <h2>No series found</h2>
                                        <p>Try a different search term</p>
                                    </div>
                                ) : (
                                    <FocusZone
                                        className="series-grid"
                                        focusKeyParam="SEARCH_SERIES_GRID"
                                        preferredChildFocusKey={selectedSeries ? `search-series-${selectedSeries.series_id}` : undefined}
                                        style={{ flex: 1, overflowY: 'auto', alignContent: 'flex-start' }}
                                    >
                                        {filteredSeries.slice(0, 100).map((series) => (
                                            <FocusableItem
                                                key={series.series_id}
                                                focusKey={`search-series-${series.series_id}`}
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
                            />
                        </div>
                    )}
                </div>

                {/* Resume Modal for Movies */}
                {showResumeModal && selectedMovie && (
                    <ResumeModal
                        name={selectedMovie.name}
                        resumeTime={watchHistoryService.getProgress(selectedMovie.stream_id)?.last_position || 0}
                        onResume={() => {
                            setShowResumeModal(false);
                            const history = watchHistoryService.getProgress(selectedMovie.stream_id);
                            const extension = selectedMovie.container_extension || movieResponse?.movie_data?.container_extension || 'mp4';
                            onPlay(selectedMovie.stream_id, extension, selectedMovie.name, selectedMovie.stream_icon, history?.last_position, 'movie');
                        }}
                        onStartOver={() => {
                            setShowResumeModal(false);
                            const extension = selectedMovie.container_extension || movieResponse?.movie_data?.container_extension || 'mp4';
                            onPlay(selectedMovie.stream_id, extension, selectedMovie.name, selectedMovie.stream_icon, 0, 'movie');
                        }}
                        onCancel={() => {
                            setShowResumeModal(false);
                            setFocus('SEARCH_PLAY_BUTTON');
                        }}
                    />
                )}
            </div>
        </FocusContext.Provider>
    );
}

export default SearchScene;
