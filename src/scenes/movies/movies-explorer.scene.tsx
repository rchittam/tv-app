import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusable, FocusContext, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { FocusableItem } from '../../components/FocusableItem';
import { FocusZone } from '../../components/FocusZone';
import { apiService } from '../../services/apiService';
import { favoritesService } from '../../services/favoritesService';
import { watchHistoryService } from '../../services/watchHistoryService';
import { ResumeModal } from '../../components/ResumeModal';
import type { VodCategory, LoginData } from '../../types/shared.types';
import './movies-explorer.css';

interface Props {
    onBack: () => void;
    onPlay: (streamId: string | number, extension: string, name: string, streamIcon?: string, initialTime?: number) => void;
    credentials: LoginData;
}

function MoviesExplorer(props: Props) {
    const { ref, focusKey, focusSelf } = useFocusable();
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedMovieForDetails, setSelectedMovieForDetails] = useState<any | null>(null);
    const [displayLimit, setDisplayLimit] = useState(50);
    const [isFavorite, setIsFavorite] = useState(false);
    const [showResumeModal, setShowResumeModal] = useState(false);

    useEffect(() => {
        focusSelf();
    }, [focusSelf]);

    // Back Button Handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.keyCode === 10009 || e.key === 'Backspace' || e.key === 'Escape') {
                if (showResumeModal) {
                    setShowResumeModal(false);
                    setFocus('PLAY_BUTTON');
                } else {
                    props.onBack();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [props, showResumeModal]);

    // Auto-focus the Play button when a movie is selected
    useEffect(() => {
        if (selectedMovieForDetails) {
            setTimeout(() => {
                setFocus('PLAY_BUTTON');
            }, 100);
            setIsFavorite(favoritesService.isFavorite(selectedMovieForDetails.stream_id));
        }
    }, [selectedMovieForDetails]);

    const handleToggleFavorite = () => {
        if (!selectedMovieForDetails) return;
        const newState = favoritesService.toggleFavorite({
            stream_id: selectedMovieForDetails.stream_id,
            name: selectedMovieForDetails.name,
            stream_icon: selectedMovieForDetails.stream_icon,
            container_extension: selectedMovieForDetails.container_extension
        });
        setIsFavorite(newState);
    };

    const handlePlayClick = () => {
        if (!selectedMovieForDetails) return;
        const history = watchHistoryService.getProgress(selectedMovieForDetails.stream_id);
        if (history && history.last_position > 0) {
            setShowResumeModal(true);
        } else {
            props.onPlay(
                selectedMovieForDetails.stream_id,
                selectedMovieForDetails.container_extension || 'mp4',
                selectedMovieForDetails.name,
                selectedMovieForDetails.stream_icon
            );
        }
    };

    const queryClient = useQueryClient();
    const { data: categories, isLoading: isLoadingCategories } = useQuery<VodCategory[]>({
        queryKey: ['vodCategories'],
        queryFn: async () => {
            // First check cache, then fetch from API if empty
            const cached = queryClient.getQueryData<VodCategory[]>(['vodCategories']);
            if (cached && cached.length > 0) return cached;
            const { userName, password, url } = props.credentials;
            return apiService.getVodCategories(userName, password, url);
        },
        staleTime: Infinity,
        gcTime: Infinity, // Prevent garbage collection until app exit
    });

    const { data: movies, isLoading: isLoadingMovies, error: moviesError } = useQuery({
        queryKey: ['vodStreams', selectedCategoryId],
        queryFn: () => {
            if (!selectedCategoryId) return [];
            const { userName, password, url } = props.credentials;
            return apiService.getVodStreams(userName, password, url, selectedCategoryId);
        },
        enabled: !!selectedCategoryId,
        staleTime: 1000 * 60 * 5,
    });

    const { data: movieDetails, isLoading: isLoadingDetails } = useQuery({
        queryKey: ['vodInfo', selectedMovieForDetails?.stream_id],
        queryFn: () => {
            if (!selectedMovieForDetails?.stream_id) return null;
            const { userName, password, url } = props.credentials;
            return apiService.getVodInfo(userName, password, url, selectedMovieForDetails.stream_id);
        },
        enabled: !!selectedMovieForDetails?.stream_id,
        staleTime: 1000 * 60 * 30,
    });

    const info = movieDetails?.info;

    const handleCategorySelect = (catId: string, catName: string) => {
        setSelectedCategory(catName);
        setSelectedCategoryId(catId);
        setDisplayLimit(50);
    };

    const visibleMovies = movies ? movies.slice(0, displayLimit) : [];

    const handleLoadMore = () => {
        if (movies && displayLimit < movies.length) {
            setDisplayLimit(prev => prev + 50);
        }
    };

    return (
        <FocusContext.Provider value={focusKey}>
            <div className="movies-explorer-container" ref={ref}>

                {/* Left Sidebar: Categories */}
                <FocusZone
                    className="categories-sidebar"
                    focusKeyParam="SIDEBAR_ZONE"
                    preferredChildFocusKey={selectedCategory ? `category-${selectedCategoryId}` : undefined}
                >
                    <h3>Categories</h3>
                    <div className="category-list">
                        {isLoadingCategories && <div className="placeholder-text">Loading...</div>}

                        {categories?.map((cat) => (
                            <FocusableItem
                                key={cat.category_id}
                                focusKey={`category-${cat.category_id}`}
                                onEnterPress={() => handleCategorySelect(cat.category_id, cat.category_name)}
                            >
                                {(focused) => (
                                    <div className={`category-item ${focused ? 'focused' : ''} ${selectedCategory === cat.category_name ? 'selected' : ''}`}>
                                        {cat.category_name}
                                    </div>
                                )}
                            </FocusableItem>
                        ))}
                    </div>
                </FocusZone>

                {/* Right Pane: Movie Grid */}
                <FocusZone
                    className="movies-content-area"
                    focusKeyParam="GRID_ZONE"
                    preferredChildFocusKey={selectedMovieForDetails ? `movie-${selectedMovieForDetails.stream_id}` : undefined}
                >
                    {selectedCategory ? (
                        <>
                            <h1>{selectedCategory}</h1>
                            {isLoadingMovies && <div className="loading-spinner">Loading Movies...</div>}
                            {moviesError && <div className="error-message">Error loading movies</div>}

                            <div className="movie-grid">
                                {visibleMovies.map((movie: any, index: number) => (
                                    <FocusableItem
                                        key={movie.stream_id}
                                        focusKey={`movie-${movie.stream_id}`}
                                        onFocus={() => {
                                            if (selectedMovieForDetails?.stream_id !== movie.stream_id) {
                                                setSelectedMovieForDetails(null);
                                            }
                                            if (index >= visibleMovies.length - 10) {
                                                handleLoadMore();
                                            }
                                        }}
                                        onEnterPress={() => {
                                            setSelectedMovieForDetails(movie);
                                        }}
                                    >
                                        {(focused) => (
                                            <div className={`movie-card ${focused ? 'focused' : ''}`}>
                                                <div className="movie-poster-container">
                                                    {movie.stream_icon ? (
                                                        <img
                                                            src={movie.stream_icon}
                                                            alt={movie.name}
                                                            className="movie-poster"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x450?text=No+Image';
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="no-poster">🎬</div>
                                                    )}
                                                </div>
                                                <div className="movie-title">{movie.name}</div>
                                            </div>
                                        )}
                                    </FocusableItem>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">Select a category</div>
                    )}
                </FocusZone>

                {/* Right Pane: Details */}
                <div className="movie-details-pane">
                    {selectedMovieForDetails ? (
                        <FocusZone className="details-content" focusKeyParam="DETAILS_ZONE" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <h2 className="details-title">{selectedMovieForDetails.name}</h2>

                            {info ? (
                                <>
                                    <div className="details-meta">
                                        {info.rating && <span className="rating">⭐ {info.rating}</span>}
                                        {info.director && <span className="director">🎬 {info.director}</span>}
                                        {info.releasedate && <span className="year">📅 {info.releasedate}</span>}
                                    </div>
                                    <p className="details-plot">{info.plot}</p>
                                    {info.cast && <p className="details-cast"><strong>Cast:</strong> {info.cast}</p>}

                                    <div className="details-actions">
                                        <FocusableItem
                                            focusKey="PLAY_BUTTON"
                                            onEnterPress={handlePlayClick}
                                        >
                                            {(focused) => (
                                                <button className={`action-btn play-btn ${focused ? 'focused' : ''}`}>
                                                    {watchHistoryService.getProgress(selectedMovieForDetails.stream_id) ? '▶ Play / Continue' : '▶ Play'}
                                                </button>
                                            )}
                                        </FocusableItem>

                                        <FocusableItem onEnterPress={handleToggleFavorite}>
                                            {(focused) => (
                                                <button className={`action-btn fav-btn ${focused ? 'focused' : ''}`}>
                                                    {isFavorite ? '❤️ Remove Favorite' : '🤍 Add Favorite'}
                                                </button>
                                            )}
                                        </FocusableItem>
                                    </div>
                                </>
                            ) : (
                                <div className="details-placeholder">
                                    {isLoadingDetails ? 'Loading details...' : 'Select a movie to see details'}
                                </div>
                            )}
                        </FocusZone>
                    ) : (
                        <div className="details-placeholder">Select a movie to see details</div>
                    )}
                </div>

                {showResumeModal && selectedMovieForDetails && (
                    <ResumeModal
                        name={selectedMovieForDetails.name}
                        resumeTime={watchHistoryService.getProgress(selectedMovieForDetails.stream_id)?.last_position || 0}
                        onResume={() => {
                            setShowResumeModal(false);
                            const history = watchHistoryService.getProgress(selectedMovieForDetails.stream_id);
                            props.onPlay(
                                selectedMovieForDetails.stream_id,
                                selectedMovieForDetails.container_extension || 'mp4',
                                selectedMovieForDetails.name,
                                selectedMovieForDetails.stream_icon,
                                history?.last_position
                            );
                        }}
                        onStartOver={() => {
                            setShowResumeModal(false);
                            props.onPlay(
                                selectedMovieForDetails.stream_id,
                                selectedMovieForDetails.container_extension || 'mp4',
                                selectedMovieForDetails.name,
                                selectedMovieForDetails.stream_icon,
                                0
                            );
                        }}
                        onCancel={() => {
                            setShowResumeModal(false);
                            setFocus('PLAY_BUTTON');
                        }}
                    />
                )}
            </div>
        </FocusContext.Provider>
    );
}

export default MoviesExplorer;
