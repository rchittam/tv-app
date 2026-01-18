import { useEffect } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { FocusableItem } from '../../components/FocusableItem';
import './landing.css';



const TILES = [
    { id: 'search', label: 'Search', icon: '🔍' },
    { id: 'movies', label: 'Movies', icon: '🎬' },
    { id: 'series', label: 'Series', icon: '📺' },
    { id: 'livetv', label: 'Live TV', icon: '📡' },
    { id: 'history', label: 'Continue Watching', icon: '🕒' },
    { id: 'favorites', label: 'Favorites', icon: '❤️' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' }
];

interface Props {
    onBack: () => void;
    onNavigate: (sceneId: string) => void;
}

function Landing(props: Props) {
    const { ref, focusKey, focusSelf } = useFocusable();

    useEffect(() => {
        focusSelf();
    }, [focusSelf]);

    // Handle Back Button
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Tizen: 10009, PC: Backspace (8) or Escape (27)
            if (e.keyCode === 10009 || e.key === 'Backspace' || e.key === 'Escape') {
                console.log('[LANDING] Back key pressed');
                props.onBack();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [props]);

    const handleTilePress = (id: string) => {
        console.log(`[LANDING] Pressed tile: ${id}`);
        props.onNavigate(id);
    };

    return (
        <FocusContext.Provider value={focusKey}>
            <div className="landing-container" ref={ref}>
                <h1 className="landing-title">Entertainment Hub</h1>

                <div className="tiles-grid">
                    {TILES.map((tile) => (
                        <FocusableItem
                            key={tile.id}
                            onEnterPress={() => handleTilePress(tile.id)}
                        >
                            {(focused) => (
                                <div className={`landing-tile ${focused ? 'focused' : ''}`}>
                                    <span className="tile-icon">{tile.icon}</span>
                                    <span className="tile-label">{tile.label}</span>
                                </div>
                            )}
                        </FocusableItem>
                    ))}
                </div>

            </div>
        </FocusContext.Provider>
    );
}

export default Landing;
