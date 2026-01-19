import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFocusable, FocusContext, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { FocusableItem } from '../../components/FocusableItem';
import { FocusZone } from '../../components/FocusZone';
import { apiService } from '../../services/apiService';
import type { LiveCategory, LiveStream, LoginData } from '../../types/shared.types';
import './livetv-explorer.css';

interface Props {
    onBack: () => void;
    onPlay: (
        streamId: string | number,
        extension: string,
        name: string,
        streamIcon?: string,
        initialTime?: number,
        contentType?: 'movie' | 'series_episode' | 'live'
    ) => void;
    credentials: LoginData;
}

function LiveTvExplorer(props: Props) {
    const { ref, focusKey, focusSelf } = useFocusable();
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedChannel, setSelectedChannel] = useState<LiveStream | null>(null);
    const [displayLimit, setDisplayLimit] = useState(50);

    useEffect(() => {
        focusSelf();
    }, [focusSelf]);

    // Back Button Handler - Hierarchical navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.keyCode === 10009 || e.key === 'Backspace' || e.key === 'Escape') {
                const currentFocus = document.activeElement;
                const isInDetails = currentFocus?.closest('.livetv-details-pane');
                const isInGrid = currentFocus?.closest('.livetv-content-area');
                const isInSidebar = currentFocus?.closest('.livetv-categories-sidebar');

                if (isInDetails) {
                    // Move back to channel grid
                    if (selectedChannel) {
                        setFocus(`livetv-channel-${selectedChannel.stream_id}`);
                    } else {
                        setFocus('LIVETV_GRID_ZONE');
                    }
                    e.preventDefault();
                    e.stopPropagation();
                } else if (isInGrid) {
                    // Move focus to categories
                    setFocus('LIVETV_SIDEBAR_ZONE');
                    e.preventDefault();
                    e.stopPropagation();
                } else if (isInSidebar) {
                    // Exit the explorer
                    props.onBack();
                    e.preventDefault();
                    e.stopPropagation();
                } else {
                    props.onBack();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [props, selectedChannel]);

    // Fetch categories
    const { data: categories, isLoading: isLoadingCategories } = useQuery<LiveCategory[]>({
        queryKey: ['liveCategories'],
        queryFn: () => {
            const { userName, password, url } = props.credentials;
            return apiService.getLiveCategories(userName, password, url);
        },
        staleTime: Infinity,
        gcTime: Infinity, // Prevent garbage collection until app exit
    });

    // Fetch channels for selected category
    const { data: channels, isLoading: isLoadingChannels } = useQuery<LiveStream[]>({
        queryKey: ['liveStreams', selectedCategoryId],
        queryFn: () => {
            if (!selectedCategoryId) return [];
            const { userName, password, url } = props.credentials;
            return apiService.getLiveStreams(userName, password, url, selectedCategoryId);
        },
        enabled: !!selectedCategoryId,
        staleTime: 1000 * 60 * 5,
    });

    const handleCategorySelect = (catId: string, catName: string) => {
        setSelectedCategory(catName);
        setSelectedCategoryId(catId);
        setSelectedChannel(null);
        setDisplayLimit(50);
    };

    const handleChannelSelect = (channel: LiveStream) => {
        setSelectedChannel(channel);
        setTimeout(() => setFocus('LIVETV_PLAY_BUTTON'), 100);
    };

    const handlePlayChannel = () => {
        if (!selectedChannel) return;
        // Live streams use .ts extension and 'live' content type
        props.onPlay(
            selectedChannel.stream_id,
            'ts', // Live streams use .ts (MPEG-TS)
            selectedChannel.name,
            selectedChannel.stream_icon,
            undefined, // initialTime
            'live' // contentType
        );
    };

    const visibleChannels = channels ? channels.slice(0, displayLimit) : [];

    const handleLoadMore = () => {
        if (channels && displayLimit < channels.length) {
            setDisplayLimit(prev => prev + 50);
        }
    };

    return (
        <FocusContext.Provider value={focusKey}>
            <div className="livetv-explorer-container" ref={ref}>

                {/* Pane 1: Categories Sidebar (15%) */}
                <FocusZone
                    className="livetv-categories-sidebar"
                    focusKeyParam="LIVETV_SIDEBAR_ZONE"
                    preferredChildFocusKey={selectedCategory ? `livetv-cat-${selectedCategoryId}` : undefined}
                >
                    <h3>📡 Live TV</h3>
                    <div className="livetv-category-list">
                        {isLoadingCategories && <div className="livetv-loading">Loading...</div>}

                        {categories?.map((cat) => (
                            <FocusableItem
                                key={cat.category_id}
                                focusKey={`livetv-cat-${cat.category_id}`}
                                onEnterPress={() => handleCategorySelect(cat.category_id, cat.category_name)}
                            >
                                {(focused) => (
                                    <div className={`livetv-category-item ${focused ? 'focused' : ''} ${selectedCategory === cat.category_name ? 'selected' : ''}`}>
                                        {cat.category_name}
                                    </div>
                                )}
                            </FocusableItem>
                        ))}
                    </div>
                </FocusZone>

                {/* Pane 2: Channel Grid (60%) */}
                <FocusZone
                    className="livetv-content-area"
                    focusKeyParam="LIVETV_GRID_ZONE"
                    preferredChildFocusKey={selectedChannel ? `livetv-channel-${selectedChannel.stream_id}` : undefined}
                >
                    {selectedCategory ? (
                        <>
                            <h1>{selectedCategory}</h1>
                            {isLoadingChannels && <div className="livetv-loading">Loading Channels...</div>}

                            <div className="livetv-channel-grid">
                                {visibleChannels.map((channel, index) => (
                                    <FocusableItem
                                        key={channel.stream_id}
                                        focusKey={`livetv-channel-${channel.stream_id}`}
                                        onFocus={() => {
                                            if (index >= visibleChannels.length - 10) {
                                                handleLoadMore();
                                            }
                                        }}
                                        onEnterPress={() => handleChannelSelect(channel)}
                                    >
                                        {(focused) => (
                                            <div className={`livetv-channel-card ${focused ? 'focused' : ''}`}>
                                                {channel.stream_icon ? (
                                                    <img
                                                        src={channel.stream_icon}
                                                        alt={channel.name}
                                                        className="livetv-channel-logo"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="livetv-channel-logo" style={{ backgroundColor: '#333' }} />
                                                )}
                                                <span className="livetv-channel-name">{channel.name}</span>
                                            </div>
                                        )}
                                    </FocusableItem>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="livetv-empty-state">
                            <h2>Select a Category</h2>
                            <p>Choose a category from the left to view channels</p>
                        </div>
                    )}
                </FocusZone>

                {/* Pane 3: Details (25%) */}
                <div className="livetv-details-pane">
                    {selectedChannel ? (
                        <FocusZone focusKeyParam="LIVETV_DETAILS_ZONE" className="livetv-details-content">
                            {selectedChannel.stream_icon && (
                                <img
                                    src={selectedChannel.stream_icon}
                                    alt={selectedChannel.name}
                                    className="livetv-details-logo"
                                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                                />
                            )}
                            <h2 className="livetv-details-title">{selectedChannel.name}</h2>

                            <div className="livetv-details-actions">
                                <FocusableItem
                                    focusKey="LIVETV_PLAY_BUTTON"
                                    onEnterPress={handlePlayChannel}
                                >
                                    {(focused) => (
                                        <button className={`livetv-play-btn ${focused ? 'focused' : ''}`}>
                                            ▶ Watch Live
                                        </button>
                                    )}
                                </FocusableItem>
                            </div>
                        </FocusZone>
                    ) : (
                        <div className="livetv-details-placeholder">
                            Select a channel to watch
                        </div>
                    )}
                </div>
            </div>
        </FocusContext.Provider>
    );
}

export default LiveTvExplorer;
