import { useEffect, useState } from 'react';
import { useFocusable, FocusContext, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { FocusableItem } from '../../components/FocusableItem';
import { FocusZone } from '../../components/FocusZone';
import { watchHistoryService } from '../../services/watchHistoryService';
import { apiService } from '../../services/apiService';
import type { WatchProgress, LoginData } from '../../types/shared.types';
import { useQuery } from '@tanstack/react-query';
import { ResumeModal } from '../../components/ResumeModal';
import '../movies/movies-explorer.css';
import '../favorites/favorites.css';
import '../series/series-explorer.css';

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

function ContinueWatchingScene({ onBack, onPlay, credentials }: Props) {
    const { ref, focusKey, focusSelf } = useFocusable();
    const [activeTab, setActiveTab] = useState<ActiveTab>('movies');

    // All history
    const [allHistory, setAllHistory] = useState<WatchProgress[]>([]);

    // Movie state
    const [selectedMovie, setSelectedMovie] = useState<WatchProgress | null>(null);
    const [showResumeModal, setShowResumeModal] = useState(false);

    // Series episode state
    const [selectedEpisode, setSelectedEpisode] = useState<WatchProgress | null>(null);
    const [showEpisodeResumeModal, setShowEpisodeResumeModal] = useState(false);

    // Filter history by content type
    const movieHistory = allHistory.filter(h => h.contentType !== 'series_episode');
    const episodeHistory = allHistory.filter(h => h.contentType === 'series_episode');

    useEffect(() => {
        focusSelf();
        setAllHistory(watchHistoryService.getHistory());
    }, [focusSelf]);

    // Handle Back Button
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.keyCode === 10009 || e.key === 'Backspace' || e.key === 'Escape') {
                if (showResumeModal) {
                    setShowResumeModal(false);
                    setFocus('CW_PLAY_BUTTON');
                } else if (showEpisodeResumeModal) {
                    setShowEpisodeResumeModal(false);
                    setFocus('CW_EP_PLAY_BUTTON');
                } else {
                    onBack();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onBack, showResumeModal, showEpisodeResumeModal]);

    // Fetch movie details for selected movie
    const { data: movieResponse } = useQuery({
        queryKey: ['vodInfo', selectedMovie?.stream_id],
        queryFn: () => {
            if (!selectedMovie?.stream_id || !credentials) return null;
            return apiService.getVodInfo(credentials.userName, credentials.password, credentials.url, selectedMovie.stream_id.toString());
        },
        enabled: !!selectedMovie?.stream_id && !!credentials && activeTab === 'movies',
        staleTime: 1000 * 60 * 30,
    });

    const movieInfo = movieResponse?.info;

    useEffect(() => {
        if (selectedMovie) {
            setTimeout(() => setFocus('CW_PLAY_BUTTON'), 100);
        }
    }, [selectedMovie]);

    useEffect(() => {
        if (selectedEpisode) {
            setTimeout(() => setFocus('CW_EP_PLAY_BUTTON'), 100);
        }
    }, [selectedEpisode]);

    const handleRemoveMovieProgress = () => {
        if (!selectedMovie) return;
        watchHistoryService.removeHistory(selectedMovie.stream_id);
        setAllHistory(watchHistoryService.getHistory());
        setSelectedMovie(null);
        setFocus('CW_MOVIES_GRID');
    };

    const handleRemoveEpisodeProgress = () => {
        if (!selectedEpisode) return;
        watchHistoryService.removeHistory(selectedEpisode.stream_id);
        setAllHistory(watchHistoryService.getHistory());
        setSelectedEpisode(null);
        setFocus('CW_EPISODES_GRID');
    };

    const handleTabChange = (tab: ActiveTab) => {
        setActiveTab(tab);
        setSelectedMovie(null);
        setSelectedEpisode(null);
        setAllHistory(watchHistoryService.getHistory());
    };

    const formatProgressTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const formatProgressPercent = (item: WatchProgress) => {
        if (item.duration <= 0) return 0;
        return Math.min((item.last_position / item.duration) * 100, 100);
    };

    return (
        <FocusContext.Provider value={focusKey}>
            <div className="favorites-container" ref={ref}>

                {/* Tab Row */}
                <FocusZone className="favorites-tab-row" focusKeyParam="CW_TABS">
                    <FocusableItem
                        focusKey="CW_TAB_MOVIES"
                        onEnterPress={() => handleTabChange('movies')}
                    >
                        {(focused) => (
                            <button className={`favorites-tab ${focused ? 'focused' : ''} ${activeTab === 'movies' ? 'active' : ''}`}>
                                🎬 Movies ({movieHistory.length})
                            </button>
                        )}
                    </FocusableItem>
                    <FocusableItem
                        focusKey="CW_TAB_SERIES"
                        onEnterPress={() => handleTabChange('series')}
                    >
                        {(focused) => (
                            <button className={`favorites-tab ${focused ? 'focused' : ''} ${activeTab === 'series' ? 'active' : ''}`}>
                                📺 Episodes ({episodeHistory.length})
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
                                {movieHistory.length === 0 ? (
                                    <div className="empty-state">
                                        <h2>No movie history</h2>
                                        <p>Movies you've watched will appear here.</p>
                                    </div>
                                ) : (
                                    <FocusZone
                                        className="movie-grid"
                                        focusKeyParam="CW_MOVIES_GRID"
                                        preferredChildFocusKey={selectedMovie ? `cw-movie-${selectedMovie.stream_id}` : undefined}
                                        style={{ flex: 1, overflowY: 'auto', alignContent: 'flex-start' }}
                                    >
                                        {movieHistory.map((movie) => (
                                            <FocusableItem
                                                key={movie.stream_id}
                                                focusKey={`cw-movie-${movie.stream_id}`}
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
                                                            {/* Progress Bar */}
                                                            <div style={{
                                                                position: 'absolute',
                                                                bottom: 0,
                                                                left: 0,
                                                                width: '100%',
                                                                height: '6px',
                                                                backgroundColor: 'rgba(0,0,0,0.5)'
                                                            }}>
                                                                <div style={{
                                                                    height: '100%',
                                                                    backgroundColor: '#e50914',
                                                                    width: `${formatProgressPercent(movie)}%`
                                                                }} />
                                                            </div>
                                                        </div>
                                                        <div className="movie-title">{movie.name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px', paddingLeft: '5px' }}>
                                                            Left at {formatProgressTime(movie.last_position)}
                                                        </div>
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
                                    <FocusZone className="details-content" focusKeyParam="CW_MOVIE_DETAILS_ZONE">
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
                                                        focusKey="CW_PLAY_BUTTON"
                                                        onEnterPress={() => setShowResumeModal(true)}
                                                    >
                                                        {(focused) => (
                                                            <button className={`action-btn play-btn ${focused ? 'focused' : ''}`}>
                                                                ▶ Play / Continue
                                                            </button>
                                                        )}
                                                    </FocusableItem>

                                                    <FocusableItem onEnterPress={handleRemoveMovieProgress}>
                                                        {(focused) => (
                                                            <button className={`action-btn ${focused ? 'focused' : ''}`} style={{ backgroundColor: '#222' }}>
                                                                🗑️ Clear Progress
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
                                        Select a movie to continue
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Series Tab Content */}
                    {activeTab === 'series' && (
                        <div className="favorites-movies-layout">
                            {/* Left Pane: Episode Grid */}
                            <div className="favorites-grid-pane">
                                {episodeHistory.length === 0 ? (
                                    <div className="empty-state">
                                        <h2>No episode history</h2>
                                        <p>Episodes you've watched will appear here.</p>
                                    </div>
                                ) : (
                                    <FocusZone
                                        className="movie-grid"
                                        focusKeyParam="CW_EPISODES_GRID"
                                        preferredChildFocusKey={selectedEpisode ? `cw-ep-${selectedEpisode.stream_id}` : undefined}
                                        style={{ flex: 1, overflowY: 'auto', alignContent: 'flex-start' }}
                                    >
                                        {episodeHistory.map((episode) => (
                                            <FocusableItem
                                                key={episode.stream_id}
                                                focusKey={`cw-ep-${episode.stream_id}`}
                                                onEnterPress={() => setSelectedEpisode(episode)}
                                            >
                                                {(focused) => (
                                                    <div className={`movie-card ${focused ? 'focused' : ''}`}>
                                                        <div className="movie-poster-container">
                                                            {episode.stream_icon && (
                                                                <img
                                                                    src={episode.stream_icon}
                                                                    alt={episode.name}
                                                                    className="movie-poster"
                                                                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                                                                />
                                                            )}
                                                            {/* Progress Bar */}
                                                            <div style={{
                                                                position: 'absolute',
                                                                bottom: 0,
                                                                left: 0,
                                                                width: '100%',
                                                                height: '6px',
                                                                backgroundColor: 'rgba(0,0,0,0.5)'
                                                            }}>
                                                                <div style={{
                                                                    height: '100%',
                                                                    backgroundColor: '#e50914',
                                                                    width: `${formatProgressPercent(episode)}%`
                                                                }} />
                                                            </div>
                                                        </div>
                                                        <div className="movie-title">{episode.name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px', paddingLeft: '5px' }}>
                                                            Left at {formatProgressTime(episode.last_position)}
                                                        </div>
                                                    </div>
                                                )}
                                            </FocusableItem>
                                        ))}
                                    </FocusZone>
                                )}
                            </div>

                            {/* Right Pane: Episode Details */}
                            <div className="movie-details-pane">
                                {selectedEpisode ? (
                                    <FocusZone className="details-content" focusKeyParam="CW_EPISODE_DETAILS_ZONE">
                                        <h2 className="details-title">{selectedEpisode.name}</h2>

                                        <div className="details-meta">
                                            {selectedEpisode.seasonNum && <span>📺 Season {selectedEpisode.seasonNum}</span>}
                                            {selectedEpisode.episodeNum && <span>🎬 Episode {selectedEpisode.episodeNum}</span>}
                                        </div>

                                        <p className="details-plot" style={{ color: '#999', marginTop: '20px' }}>
                                            You left off at {formatProgressTime(selectedEpisode.last_position)}
                                        </p>

                                        <div className="details-actions">
                                            <FocusableItem
                                                focusKey="CW_EP_PLAY_BUTTON"
                                                onEnterPress={() => setShowEpisodeResumeModal(true)}
                                            >
                                                {(focused) => (
                                                    <button className={`action-btn play-btn ${focused ? 'focused' : ''}`}>
                                                        ▶ Play / Continue
                                                    </button>
                                                )}
                                            </FocusableItem>

                                            <FocusableItem onEnterPress={handleRemoveEpisodeProgress}>
                                                {(focused) => (
                                                    <button className={`action-btn ${focused ? 'focused' : ''}`} style={{ backgroundColor: '#222' }}>
                                                        🗑️ Clear Progress
                                                    </button>
                                                )}
                                            </FocusableItem>
                                        </div>
                                    </FocusZone>
                                ) : (
                                    <div className="details-placeholder">
                                        Select an episode to continue
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Movie Resume Modal */}
                {showResumeModal && selectedMovie && (
                    <ResumeModal
                        name={selectedMovie.name}
                        resumeTime={selectedMovie.last_position}
                        onResume={() => {
                            setShowResumeModal(false);
                            onPlay(
                                selectedMovie.stream_id,
                                selectedMovie.container_extension || 'mp4',
                                selectedMovie.name,
                                selectedMovie.stream_icon,
                                selectedMovie.last_position,
                                'movie'
                            );
                        }}
                        onStartOver={() => {
                            setShowResumeModal(false);
                            onPlay(
                                selectedMovie.stream_id,
                                selectedMovie.container_extension || 'mp4',
                                selectedMovie.name,
                                selectedMovie.stream_icon,
                                0,
                                'movie'
                            );
                        }}
                        onCancel={() => {
                            setShowResumeModal(false);
                            setFocus('CW_PLAY_BUTTON');
                        }}
                    />
                )}

                {/* Episode Resume Modal */}
                {showEpisodeResumeModal && selectedEpisode && (
                    <ResumeModal
                        name={selectedEpisode.name}
                        resumeTime={selectedEpisode.last_position}
                        onResume={() => {
                            setShowEpisodeResumeModal(false);
                            onPlay(
                                selectedEpisode.stream_id,
                                selectedEpisode.container_extension || 'mp4',
                                selectedEpisode.name,
                                selectedEpisode.stream_icon,
                                selectedEpisode.last_position,
                                'series_episode',
                                selectedEpisode.seriesId,
                                selectedEpisode.seasonNum,
                                selectedEpisode.episodeNum
                            );
                        }}
                        onStartOver={() => {
                            setShowEpisodeResumeModal(false);
                            onPlay(
                                selectedEpisode.stream_id,
                                selectedEpisode.container_extension || 'mp4',
                                selectedEpisode.name,
                                selectedEpisode.stream_icon,
                                0,
                                'series_episode',
                                selectedEpisode.seriesId,
                                selectedEpisode.seasonNum,
                                selectedEpisode.episodeNum
                            );
                        }}
                        onCancel={() => {
                            setShowEpisodeResumeModal(false);
                            setFocus('CW_EP_PLAY_BUTTON');
                        }}
                    />
                )}
            </div>
        </FocusContext.Provider>
    );
}

export default ContinueWatchingScene;
