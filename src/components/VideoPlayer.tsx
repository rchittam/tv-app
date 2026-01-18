import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import shaka from 'shaka-player/dist/shaka-player.ui';
import 'shaka-player/dist/controls.css';

export interface VideoPlayerRef {
    play: () => void;
    pause: () => void;
    seek: (time: number) => void;
    getCurrentTime: () => number;
    getDuration: () => number;
    videoElement: HTMLVideoElement | null;
}

interface VideoPlayerProps {
    src: string;
    autoPlay?: boolean;
    onEnded?: () => void;
    onError?: (error: any) => void;
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({ src, autoPlay = true, onEnded, onError }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<shaka.Player | null>(null);

    useImperativeHandle(ref, () => ({
        play: () => videoRef.current?.play(),
        pause: () => videoRef.current?.pause(),
        seek: (time: number) => {
            if (videoRef.current) videoRef.current.currentTime = time;
        },
        getCurrentTime: () => videoRef.current?.currentTime || 0,
        getDuration: () => videoRef.current?.duration || 0,
        videoElement: videoRef.current
    }));

    useEffect(() => {
        // Install polyfills
        shaka.polyfill.installAll();

        if (shaka.Player.isBrowserSupported()) {
            initPlayer();
        } else {
            console.error('Browser not supported!');
            if (onError) onError(new Error('Browser not supported'));
        }

        return () => {
            if (playerRef.current) {
                playerRef.current.destroy();
            }
        };
    }, []);

    // Load source when src changes
    useEffect(() => {
        if (playerRef.current && src) {
            loadSource(src);
        }
    }, [src]);

    const initPlayer = async () => {
        if (!videoRef.current || !containerRef.current) return;

        const player = new shaka.Player(videoRef.current);

        // Listen for error events.
        player.addEventListener('error', (event: any) => {
            console.error('Error code', event.detail.code, 'object', event.detail);
            if (onError) onError(event.detail);
        });

        playerRef.current = player;

        // Use Shaka UI Overlay
        const ui = new shaka.ui.Overlay(player, containerRef.current, videoRef.current);
        ui.configure({
            'controlPanelElements': ['play_pause', 'time_and_duration', 'spacer', 'fullscreen', 'overflow_menu']
        });

        if (src) {
            await loadSource(src);
        }
    };

    const loadSource = async (url: string) => {
        if (!playerRef.current) return;
        try {
            await playerRef.current.load(url);
            console.log('Video loaded:', url);
            if (autoPlay && videoRef.current) {
                videoRef.current.play();
            }
        } catch (e: any) {
            console.error('Error loading video', e);
            if (onError) onError(e);
        }
    };

    return (
        <div
            ref={containerRef}
            className="video-container"
            style={{ width: '100%', height: '100%', backgroundColor: 'black' }}
        >
            <video
                ref={videoRef}
                style={{ width: '100%', height: '100%' }}
                crossOrigin="anonymous"
                onEnded={onEnded}
            />
        </div>
    );
});
