import { useEffect, useRef, useState } from 'react';
import { VideoPlayer } from '../../components/VideoPlayer';
import type { VideoPlayerRef } from '../../components/VideoPlayer';
import type { LoginData } from '../../types/shared.types';
import { apiService } from '../../services/apiService';
import { watchHistoryService } from '../../services/watchHistoryService';

interface Props {
    streamId: number | string;
    streamExtension?: string; // e.g., 'mkv', 'mp4' (default), 'ts' for live
    name: string;
    streamIcon?: string;
    credentials: LoginData;
    onBack: () => void;
    initialTime?: number;
    contentType?: 'movie' | 'series_episode' | 'live';
    seriesId?: number;
    seasonNum?: number;
    episodeNum?: number;
}

function PlayerScene({
    streamId,
    streamExtension = 'mp4',
    name,
    streamIcon,
    credentials,
    onBack,
    initialTime = 0,
    contentType = 'movie',
    seriesId,
    seasonNum,
    episodeNum
}: Props) {
    const playerRef = useRef<VideoPlayerRef>(null);
    const [isSeeking, setIsSeeking] = useState(false);
    const [seekTime, setSeekTime] = useState(0);
    const seekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Construct URL based on content type
    const baseUrl = apiService.normalizeUrl(credentials.url);
    const getStreamUrl = () => {
        switch (contentType) {
            case 'live':
                return `${baseUrl}/live/${credentials.userName}/${credentials.password}/${streamId}.${streamExtension}`;
            case 'series_episode':
                return `${baseUrl}/series/${credentials.userName}/${credentials.password}/${streamId}.${streamExtension}`;
            case 'movie':
            default:
                return `${baseUrl}/movie/${credentials.userName}/${credentials.password}/${streamId}.${streamExtension}`;
        }
    };
    const streamUrl = getStreamUrl();

    // Handle initial seek for resume
    useEffect(() => {
        if (initialTime > 0 && playerRef.current) {
            const timer = setTimeout(() => {
                console.log(`[Player] Resuming at ${initialTime}s`);
                playerRef.current?.seek(initialTime);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [initialTime]);

    // Handle Back Navigation & Controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.keyCode === 10009 || e.key === 'Backspace' || e.key === 'Escape') {
                // Save progress before exiting
                if (playerRef.current) {
                    const currentTime = playerRef.current.getCurrentTime();
                    const duration = playerRef.current.getDuration();

                    if (currentTime > 180) {
                        watchHistoryService.saveProgress({
                            stream_id: streamId,
                            name: name,
                            stream_icon: streamIcon,
                            container_extension: streamExtension,
                            last_position: currentTime,
                            duration: duration,
                            contentType: contentType,
                            seriesId: seriesId,
                            seasonNum: seasonNum,
                            episodeNum: episodeNum
                        });
                    }
                }
                onBack();
                return;
            }

            if (!playerRef.current) return;

            if (e.key === 'Enter') {
                if (isSeeking) {
                    commitSeek();
                } else {
                    const video = playerRef.current.videoElement;
                    if (video?.paused) playerRef.current.play();
                    else playerRef.current.pause();
                }
            }

            if (e.key === 'ArrowRight') {
                handleSeek(10);
            }

            if (e.key === 'ArrowLeft') {
                handleSeek(-10);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onBack, isSeeking, seekTime, streamId, name, streamIcon, streamExtension]);

    const handleSeek = (amount: number) => {
        if (!playerRef.current) return;

        if (!isSeeking) {
            playerRef.current.pause();
            setIsSeeking(true);
            setSeekTime(playerRef.current.getCurrentTime() + amount);
        } else {
            setSeekTime(prev => {
                const newTime = prev + amount;
                const duration = playerRef.current?.getDuration() || 0;
                return Math.max(0, Math.min(newTime, duration));
            });
        }

        if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
        seekTimeoutRef.current = setTimeout(() => {
            commitSeek();
        }, 2000);
    };

    const commitSeek = () => {
        if (!playerRef.current) return;
        playerRef.current.seek(seekTime);
        playerRef.current.play();
        setIsSeeking(false);
        if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="player-scene" style={{ width: '100vw', height: '100vh', backgroundColor: 'black' }}>
            <VideoPlayer
                ref={playerRef}
                src={streamUrl}
                autoPlay={true}
                onError={(e) => console.error('Playback Error', e)}
                onEnded={() => {
                    console.log('Playback Ended');
                    watchHistoryService.removeHistory(streamId);
                    onBack();
                }}
            />

            {isSeeking && (
                <div style={{
                    position: 'absolute',
                    bottom: '100px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    zIndex: 100
                }}>
                    Scrubbing: {formatTime(seekTime)}
                    <div style={{ fontSize: '14px', opacity: 0.8, marginTop: '4px' }}>
                        Press ENTER to Resume
                    </div>
                </div>
            )}
        </div>
    );
}

export default PlayerScene;
