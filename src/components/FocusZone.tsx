import React from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';

interface FocusZoneProps {
    children: React.ReactNode;
    className?: string;
    focusKey?: string;
    focusKeyParam?: string; // Optional manual key
    preferredChildFocusKey?: string;
    onFocus?: () => void;
    style?: React.CSSProperties;
}

export function FocusZone({
    children,
    className,
    focusKeyParam,
    preferredChildFocusKey,
    onFocus,
    style
}: FocusZoneProps) {

    const { ref, focusKey } = useFocusable({
        focusable: true,
        saveLastFocusedChild: true, // Enable history to prevent jumps to top
        trackChildren: true,
        autoRestoreFocus: true,
        isFocusBoundary: false,
        focusKey: focusKeyParam,
        preferredChildFocusKey: preferredChildFocusKey,
        onFocus: onFocus
    });

    return (
        <FocusContext.Provider value={focusKey}>
            <div ref={ref} className={className} style={style || { outline: 'none' }}>
                {children}
            </div>
        </FocusContext.Provider>
    );
}
