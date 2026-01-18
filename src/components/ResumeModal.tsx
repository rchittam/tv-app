import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useEffect } from 'react';
import { FocusableItem } from './FocusableItem';

interface Props {
    name: string;
    resumeTime: number; // in seconds
    onResume: () => void;
    onStartOver: () => void;
    onCancel: () => void;
}

export function ResumeModal({ name, resumeTime, onResume, onStartOver, onCancel }: Props) {
    const { ref, focusKey, focusSelf } = useFocusable();

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        const h = Math.floor(m / 60);
        const mins = m % 60;

        if (h > 0) {
            return `${h}:${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
        }
        return `${mins}:${s < 10 ? '0' : ''}${s}`;
    };

    useEffect(() => {
        focusSelf();
    }, [focusSelf]);

    return (
        <FocusContext.Provider value={focusKey}>
            <div className="resume-modal-overlay" ref={ref} style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(0,0,0,0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2000
            }}>
                <div className="resume-modal-content" style={{
                    backgroundColor: '#1a1a1a',
                    padding: '40px',
                    borderRadius: '12px',
                    border: '1px solid #333',
                    textAlign: 'center',
                    maxWidth: '600px',
                    width: '90%'
                }}>
                    <h2 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Resume watching?</h2>
                    <p style={{ fontSize: '1.2rem', color: '#aaa', marginBottom: '30px' }}>
                        You left off at <strong>{formatTime(resumeTime)}</strong> in <strong>{name}</strong>. Would you like to continue?
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <FocusableItem focusKey="RESUME_BTN" onEnterPress={onResume}>
                            {(focused) => (
                                <button className={`action-btn play-btn ${focused ? 'focused' : ''}`}>
                                    ▶ Resume from {formatTime(resumeTime)}
                                </button>
                            )}
                        </FocusableItem>

                        <FocusableItem onEnterPress={onStartOver}>
                            {(focused) => (
                                <button className={`action-btn ${focused ? 'focused' : ''}`} style={{ backgroundColor: '#333' }}>
                                    🔄 Start from Beginning
                                </button>
                            )}
                        </FocusableItem>

                        <FocusableItem onEnterPress={onCancel}>
                            {(focused) => (
                                <button className={`action-btn ${focused ? 'focused' : ''}`} style={{ backgroundColor: 'transparent', opacity: 0.6 }}>
                                    Cancel
                                </button>
                            )}
                        </FocusableItem>
                    </div>
                </div>
            </div>
        </FocusContext.Provider>
    );
}
