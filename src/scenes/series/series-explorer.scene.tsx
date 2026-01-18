import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFocusable, FocusContext, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { FocusableItem } from '../../components/FocusableItem';
import { FocusZone } from '../../components/FocusZone';
import { apiService } from '../../services/apiService';
import { SeriesDashboard } from './components/SeriesDashboard';
import type { SeriesCategory, SeriesStream, LoginData } from '../../types/shared.types';
import './series-explorer.css';

interface Props {
    onBack: () => void;
    onPlay: (streamId: string | number, extension: string, name: string, streamIcon?: string, initialTime?: number) => void;
    credentials: LoginData;
}

function SeriesExplorer(props: Props) {
    const { ref, focusKey, focusSelf } = useFocusable();
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedSeries, setSelectedSeries] = useState<SeriesStream | null>(null);
    const [displayLimit, setDisplayLimit] = useState(50);

    useEffect(() => {
        focusSelf();
    }, [focusSelf]);

    // Back Button Handler - Hierarchical navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.keyCode === 10009 || e.key === 'Backspace' || e.key === 'Escape') {
                // Determine current focus zone
                const currentFocus = document.activeElement;
                const isInDashboard = currentFocus?.closest('.series-dashboard-pane');
                const isInGrid = currentFocus?.closest('.series-content-area');
                const isInSidebar = currentFocus?.closest('.series-categories-sidebar');

                if (isInDashboard) {
                    // Dashboard handles its own back logic, let it bubble
                    return;
                } else if (isInGrid) {
                    // Move focus to categories
                    setFocus('SERIES_SIDEBAR_ZONE');
                    e.preventDefault();
                    e.stopPropagation();
                } else if (isInSidebar) {
                    // Exit the explorer
                    props.onBack();
                    e.preventDefault();
                    e.stopPropagation();
                } else {
                    // Default: exit
                    props.onBack();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [props]);

    // Fetch categories
    const { data: categories, isLoading: isLoadingCategories } = useQuery<SeriesCategory[]>({
        queryKey: ['seriesCategories'],
        queryFn: () => {
            const { userName, password, url } = props.credentials;
            return apiService.getSeriesCategories(userName, password, url);
        },
        staleTime: 1000 * 60 * 10,
    });

    // Fetch series for selected category
    const { data: seriesList, isLoading: isLoadingSeries, error: seriesError } = useQuery<SeriesStream[]>({
        queryKey: ['seriesStreams', selectedCategoryId],
        queryFn: () => {
            if (!selectedCategoryId) return [];
            const { userName, password, url } = props.credentials;
            return apiService.getSeriesStreams(userName, password, url, selectedCategoryId);
        },
        enabled: !!selectedCategoryId,
        staleTime: 1000 * 60 * 5,
    });

    const handleCategorySelect = (catId: string, catName: string) => {
        setSelectedCategory(catName);
        setSelectedCategoryId(catId);
        setSelectedSeries(null);
        setDisplayLimit(50);
    };

    const handleSeriesSelect = (series: SeriesStream) => {
        setSelectedSeries(series);
    };

    const handleDashboardBack = () => {
        // Move focus back to the series grid
        if (selectedSeries) {
            setFocus(`series-${selectedSeries.series_id}`);
        } else {
            setFocus('SERIES_GRID_ZONE');
        }
    };

    const visibleSeries = seriesList ? seriesList.slice(0, displayLimit) : [];

    const handleLoadMore = () => {
        if (seriesList && displayLimit < seriesList.length) {
            setDisplayLimit(prev => prev + 50);
        }
    };

    return (
        <FocusContext.Provider value={focusKey}>
            <div className="series-explorer-container" ref={ref}>

                {/* Pane 1: Categories Sidebar (15%) */}
                <FocusZone
                    className="series-categories-sidebar"
                    focusKeyParam="SERIES_SIDEBAR_ZONE"
                    preferredChildFocusKey={selectedCategory ? `series-category-${selectedCategoryId}` : undefined}
                >
                    <h3>Series</h3>
                    <div className="series-category-list">
                        {isLoadingCategories && <div className="series-loading">Loading...</div>}

                        {categories?.map((cat) => (
                            <FocusableItem
                                key={cat.category_id}
                                focusKey={`series-category-${cat.category_id}`}
                                onEnterPress={() => handleCategorySelect(cat.category_id, cat.category_name)}
                            >
                                {(focused) => (
                                    <div className={`series-category-item ${focused ? 'focused' : ''} ${selectedCategory === cat.category_name ? 'selected' : ''}`}>
                                        {cat.category_name}
                                    </div>
                                )}
                            </FocusableItem>
                        ))}
                    </div>
                </FocusZone>

                {/* Pane 2: Series Grid (32%) */}
                <FocusZone
                    className="series-content-area"
                    focusKeyParam="SERIES_GRID_ZONE"
                    preferredChildFocusKey={selectedSeries ? `series-${selectedSeries.series_id}` : undefined}
                >
                    {selectedCategory ? (
                        <>
                            <h1>{selectedCategory}</h1>
                            {isLoadingSeries && <div className="series-loading">Loading Series...</div>}
                            {seriesError && <div className="series-empty-state">Error loading series</div>}

                            <div className="series-grid">
                                {visibleSeries.map((series, index) => (
                                    <FocusableItem
                                        key={series.series_id}
                                        focusKey={`series-${series.series_id}`}
                                        onFocus={() => {
                                            if (index >= visibleSeries.length - 10) {
                                                handleLoadMore();
                                            }
                                        }}
                                        onEnterPress={() => handleSeriesSelect(series)}
                                    >
                                        {(focused) => (
                                            <div className={`series-card ${focused ? 'focused' : ''}`}>
                                                <div className="series-poster-container">
                                                    {series.cover ? (
                                                        <img
                                                            src={series.cover}
                                                            alt={series.name}
                                                            className="series-poster"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/140x210?text=No+Image';
                                                            }}
                                                        />
                                                    ) : null}
                                                </div>
                                                <div className="series-title">{series.name}</div>
                                            </div>
                                        )}
                                    </FocusableItem>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="series-empty-state">Select a category</div>
                    )}
                </FocusZone>

                {/* Pane 3: Series Dashboard (53%) */}
                <SeriesDashboard
                    seriesId={selectedSeries?.series_id || null}
                    seriesName={selectedSeries?.name}
                    seriesCover={selectedSeries?.cover}
                    credentials={props.credentials}
                    onPlayEpisode={props.onPlay}
                    onBack={handleDashboardBack}
                />
            </div>
        </FocusContext.Provider>
    );
}

export default SeriesExplorer;
