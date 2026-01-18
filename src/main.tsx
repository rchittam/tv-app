import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { init } from '@noriginmedia/norigin-spatial-navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import './scenes/login/login.css';
import Login from './scenes/login/login.scene';
import Landing from './scenes/landing/landing.scene';
import MoviesExplorer from './scenes/movies/movies-explorer.scene';
import SeriesExplorer from './scenes/series/series-explorer.scene';
import LiveTvExplorer from './scenes/livetv/livetv-explorer.scene';
import PlayerScene from './scenes/player/player.scene';
import FavoritesScene from './scenes/favorites/favorites.scene';
import ContinueWatchingScene from './scenes/continue-watching/continue-watching.scene';
import SearchScene from './scenes/search/search.scene';
import type { LoginData } from './types/shared.types';
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

init({
  debug: false,
  visualDebug: false,
});

type View = 'LOGIN' | 'LANDING' | 'MOVIES' | 'SERIES' | 'LIVETV' | 'PLAYER' | 'FAVORITES' | 'CONTINUE_WATCHING' | 'SEARCH';

interface PlayerState {
  streamId: string | number;
  extension: string;
  name: string;
  streamIcon?: string;
  initialTime?: number;
  contentType: 'movie' | 'series_episode' | 'live';
  seriesId?: number;
  seasonNum?: number;
  episodeNum?: number;
}

function App() {
  const [view, setView] = useState<View>('LOGIN');
  const [lastView, setLastView] = useState<View | null>(null);
  const [loginData, setLoginData] = useState<LoginData | null>(null);
  const [playerData, setPlayerData] = useState<PlayerState | null>(null);
  const { focusKey, focusSelf } = useFocusable();

  React.useEffect(() => {
    focusSelf();
  }, [focusSelf]);

  const handlePlay = (
    streamId: string | number,
    extension: string,
    name: string,
    streamIcon?: string,
    initialTime?: number,
    contentType: 'movie' | 'series_episode' | 'live' = 'movie',
    seriesId?: number,
    seasonNum?: number,
    episodeNum?: number
  ) => {
    setPlayerData({ streamId, extension, name, streamIcon, initialTime, contentType, seriesId, seasonNum, episodeNum });
    setLastView(view);
    setView('PLAYER');
  };

  return (
    <FocusContext.Provider value={focusKey}>
      <QueryClientProvider client={queryClient}>
        {view === 'LOGIN' && (
          <Login onSubmit={(data) => {
            setLoginData(data);
            setView('LANDING');
          }} />
        )}

        {view === 'LANDING' && (
          <Landing
            onBack={() => setView('LOGIN')}
            onNavigate={(sceneId) => {
              if (sceneId === 'movies') setView('MOVIES');
              else if (sceneId === 'series') setView('SERIES');
              else if (sceneId === 'livetv') setView('LIVETV');
              else if (sceneId === 'favorites') setView('FAVORITES');
              else if (sceneId === 'history') setView('CONTINUE_WATCHING');
              else if (sceneId === 'search') setView('SEARCH');
            }}
          />
        )}

        {view === 'MOVIES' && loginData && (
          <MoviesExplorer
            onBack={() => setView('LANDING')}
            credentials={loginData}
            onPlay={handlePlay}
          />
        )}

        {view === 'SERIES' && loginData && (
          <SeriesExplorer
            onBack={() => setView('LANDING')}
            credentials={loginData}
            onPlay={handlePlay}
          />
        )}

        {view === 'LIVETV' && loginData && (
          <LiveTvExplorer
            onBack={() => setView('LANDING')}
            credentials={loginData}
            onPlay={handlePlay}
          />
        )}

        {view === 'PLAYER' && loginData && playerData && (
          <PlayerScene
            streamId={playerData.streamId}
            streamExtension={playerData.extension}
            name={playerData.name}
            streamIcon={playerData.streamIcon}
            initialTime={playerData.initialTime}
            contentType={playerData.contentType}
            seriesId={playerData.seriesId}
            seasonNum={playerData.seasonNum}
            episodeNum={playerData.episodeNum}
            credentials={loginData}
            onBack={() => setView(lastView || 'LANDING')}
          />
        )}

        {view === 'FAVORITES' && loginData && (
          <FavoritesScene
            onBack={() => setView('LANDING')}
            credentials={loginData}
            onPlay={handlePlay}
          />
        )}

        {view === 'CONTINUE_WATCHING' && loginData && (
          <ContinueWatchingScene
            onBack={() => setView('LANDING')}
            credentials={loginData}
            onPlay={handlePlay}
          />
        )}

        {view === 'SEARCH' && loginData && (
          <SearchScene
            onBack={() => setView('LANDING')}
            credentials={loginData}
            onPlay={handlePlay}
          />
        )}
      </QueryClientProvider>
    </FocusContext.Provider>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}