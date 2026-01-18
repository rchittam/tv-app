import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFocusable, FocusContext, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { FocusableItem } from '../../../components/FocusableItem';
import { FocusZone } from '../../../components/FocusZone';
import { apiService } from '../../../services/apiService';
import { favoritesService } from '../../../services/favoritesService';
import { watchHistoryService } from '../../../services/watchHistoryService';
import type { LoginData, SeriesInfo, Episode } from '../../../types/shared.types';

interface SeriesDashboardProps {
    seriesId: number | null;
    seriesName?: string;
    seriesCover?: string;
    credentials: LoginData;
    onPlayEpisode: (
        streamId: string,
        extension: string,
        name: string,
        streamIcon?: string,
        initialTime?: number,
        contentType?: 'movie' | 'series_episode',
        seriesId?: number,
        seasonNum?: number,
        episodeNum?: number
    ) => void;
    onBack?: () => void;
    onFavoriteChange?: (isFavorite: boolean) => void;
}

export function SeriesDashboard({
    seriesId,
    seriesName,
    seriesCover,
    credentials,
    onPlayEpisode,
    onBack,
    onFavoriteChange
}: SeriesDashboardProps) {
    const { ref, focusKey } = useFocusable();
    const [selectedSeasonNum, setSelectedSeasonNum] = useState<number>(1);
    const [focusedEpisodeId, setFocusedEpisodeId] = useState<string | null>(null);
    const [isFavorite, setIsFavorite] = useState(false);

    // Fetch series info
    const { data: seriesInfo, isLoading } = useQuery<SeriesInfo>({
        queryKey: ['seriesInfo', seriesId],
        queryFn: () => {
            if (!seriesId) return Promise.resolve(null);
            const { userName, password, url } = credentials;
            return apiService.getSeriesInfo(userName, password, url, seriesId);
        },
        enabled: !!seriesId,
        staleTime: 1000 * 60 * 30,
    });

    // Update favorite status when series changes
    useEffect(() => {
        if (seriesId) {
            setIsFavorite(favoritesService.isSeriesFavorite(seriesId));
        }
    }, [seriesId]);

    // Reset season selection when series changes - default to first season WITH episodes
    useEffect(() => {
        if (seriesInfo?.seasons && seriesInfo.episodes) {
            // Find first season that has episodes
            const firstSeasonWithEpisodes = seriesInfo.seasons.find(
                s => (seriesInfo.episodes[String(s.season_number)]?.length || 0) > 0
            );
            if (firstSeasonWithEpisodes) {
                setSelectedSeasonNum(firstSeasonWithEpisodes.season_number);
            } else if (seriesInfo.seasons.length > 0) {
                setSelectedSeasonNum(seriesInfo.seasons[0].season_number);
            }
        }
    }, [seriesInfo]);

    // Auto-focus first episode when series changes and episodes are loaded
    useEffect(() => {
        if (seriesId && seriesInfo?.episodes) {
            const episodes = seriesInfo.episodes[String(selectedSeasonNum)] || [];
            if (episodes.length > 0) {
                const firstEpisode = episodes[0];
                setTimeout(() => setFocus(`episode-${firstEpisode.id}`), 150);
            }
        }
    }, [seriesId, seriesInfo, selectedSeasonNum]);

    // Handle back button in dashboard
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.keyCode === 10009 || e.key === 'Backspace' || e.key === 'Escape') {
                // If we have a focused episode, unfocus it first
                const currentFocus = document.activeElement;
                const isInEpisodes = currentFocus?.closest('.episode-list');
                const isInSeasons = currentFocus?.closest('.season-selector');

                if (isInEpisodes) {
                    // Move focus to seasons
                    setFocus('SEASON_ZONE');
                    e.preventDefault();
                    e.stopPropagation();
                } else if (isInSeasons && onBack) {
                    onBack();
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [onBack]);

    const handleToggleFavorite = () => {
        if (!seriesId || !seriesName) return;
        const newState = favoritesService.toggleSeriesFavorite({
            series_id: seriesId,
            name: seriesName,
            cover: seriesCover
        });
        setIsFavorite(newState);
        // Notify parent of change
        onFavoriteChange?.(newState);
    };

    const handlePlayEpisode = (episode: Episode) => {
        const streamId = episode.id;
        const extension = episode.container_extension || 'mp4';
        const episodeName = `${seriesInfo?.info?.name || seriesName} - S${selectedSeasonNum}E${episode.episode_num}: ${episode.title}`;
        const thumbnail = episode.info?.movie_image;

        // Check for resume position
        const history = watchHistoryService.getProgress(streamId);
        if (history && history.last_position > 0) {
            onPlayEpisode(
                streamId,
                extension,
                episodeName,
                thumbnail,
                history.last_position,
                'series_episode',
                seriesId || undefined,
                selectedSeasonNum,
                episode.episode_num
            );
        } else {
            onPlayEpisode(
                streamId,
                extension,
                episodeName,
                thumbnail,
                undefined,
                'series_episode',
                seriesId || undefined,
                selectedSeasonNum,
                episode.episode_num
            );
        }
    };

    const episodes = seriesInfo?.episodes?.[String(selectedSeasonNum)] || [];
    const info = seriesInfo?.info;

    // Filter seasons to only show those with episodes
    const seasonsWithEpisodes = seriesInfo?.seasons?.filter(
        s => (seriesInfo?.episodes?.[String(s.season_number)]?.length || 0) > 0
    ) || [];

    if (!seriesId) {
        return (
            <div className="series-dashboard-pane">
                <div className="dashboard-placeholder">Select a series to see details</div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="series-dashboard-pane">
                <div className="series-loading">Loading series info...</div>
            </div>
        );
    }

    return (
        <FocusContext.Provider value={focusKey}>
            <div className="series-dashboard-pane" ref={ref}>
                <div className="dashboard-content">
                    {/* Series Info Header */}
                    <div className="series-info-header">
                        {(info?.cover || seriesCover) && (
                            <img
                                src={info?.cover || seriesCover}
                                alt={info?.name || seriesName}
                                className="series-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        )}
                        <div className="series-meta">
                            <h2>{info?.name || seriesName}</h2>
                            <div className="series-meta-row">
                                {info?.rating && <span>⭐ {info.rating}</span>}
                                {info?.genre && <span>🎭 {info.genre}</span>}
                                {info?.releaseDate && <span>📅 {info.releaseDate}</span>}
                            </div>
                            {info?.plot && <p className="series-plot">{info.plot}</p>}

                            <div className="series-actions">
                                <FocusableItem
                                    focusKey="FAV_SERIES_BTN"
                                    onEnterPress={handleToggleFavorite}
                                >
                                    {(focused) => (
                                        <button className={`action-btn ${focused ? 'focused' : ''}`}>
                                            {isFavorite ? '❤️ Remove Favorite' : '🤍 Add to Favorites'}
                                        </button>
                                    )}
                                </FocusableItem>
                            </div>
                        </div>
                    </div>

                    {/* Season Selector - Only show seasons with episodes */}
                    {seasonsWithEpisodes.length > 1 && (
                        <FocusZone className="season-selector" focusKeyParam="SEASON_ZONE">
                            {seasonsWithEpisodes.map((season) => (
                                <FocusableItem
                                    key={season.season_number}
                                    focusKey={`season-${season.season_number}`}
                                    onEnterPress={() => {
                                        setSelectedSeasonNum(season.season_number);
                                        setFocusedEpisodeId(null);
                                    }}
                                >
                                    {(focused) => (
                                        <button
                                            className={`season-btn ${focused ? 'focused' : ''} ${selectedSeasonNum === season.season_number ? 'selected' : ''}`}
                                        >
                                            Season {season.season_number}
                                        </button>
                                    )}
                                </FocusableItem>
                            ))}
                        </FocusZone>
                    )}

                    {/* Episode List */}
                    <FocusZone className="episode-list" focusKeyParam="EPISODE_ZONE">
                        {episodes.length === 0 && (
                            <div className="dashboard-placeholder">No episodes available</div>
                        )}
                        {episodes.map((episode) => {
                            const isExpanded = focusedEpisodeId === episode.id;
                            const progress = watchHistoryService.getProgress(episode.id);
                            const progressPercent = progress && progress.duration > 0
                                ? (progress.last_position / progress.duration) * 100
                                : 0;

                            return (
                                <FocusableItem
                                    key={episode.id}
                                    focusKey={`episode-${episode.id}`}
                                    onFocus={() => setFocusedEpisodeId(episode.id)}
                                    onEnterPress={() => handlePlayEpisode(episode)}
                                >
                                    {(focused) => (
                                        <div className={`episode-card ${focused ? 'focused' : ''} ${isExpanded ? 'expanded' : ''}`}>
                                            <div className="episode-header">
                                                <span className="episode-number">E{episode.episode_num}</span>
                                                <span className="episode-title">{episode.title}</span>
                                                {episode.info?.duration && (
                                                    <span className="episode-duration">{episode.info.duration}</span>
                                                )}
                                            </div>

                                            {/* Expanded Details */}
                                            {isExpanded && (
                                                <div className="episode-details">
                                                    {episode.info?.movie_image && (
                                                        <div className="episode-thumbnail-container">
                                                            <img
                                                                src={episode.info.movie_image}
                                                                alt={episode.title}
                                                                className="episode-thumbnail"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                                }}
                                                            />
                                                            {progressPercent > 0 && (
                                                                <div
                                                                    className="episode-progress-bar"
                                                                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                                                                />
                                                            )}
                                                        </div>
                                                    )}
                                                    <div className="episode-info">
                                                        {episode.info?.plot && (
                                                            <p className="episode-plot">{episode.info.plot}</p>
                                                        )}
                                                        {episode.info?.releasedate && (
                                                            <span className="episode-air-date">
                                                                Aired: {episode.info.releasedate}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </FocusableItem>
                            );
                        })}
                    </FocusZone>
                </div>
            </div>
        </FocusContext.Provider>
    );
}
