import React from 'react';
import { useFocusable, type UseFocusableConfig } from '@noriginmedia/norigin-spatial-navigation';

interface FocusableItemProps extends UseFocusableConfig {
  children: (focused: boolean) => React.ReactNode;
  className?: string;
}

export const FocusableItem: React.FC<FocusableItemProps> = ({
  children,
  onEnterPress,
  onFocus,
  onBlur,
  className,
  ...props
}) => {
  const { ref, focused, focusSelf } = useFocusable({
    onEnterPress,
    onFocus,
    onBlur: (layout, extraProps, details) => {
      // Blur any focused input inside this component when spatial focus leaves
      if (ref.current) {
        const input = ref.current.querySelector('input, textarea, select');
        if (input && document.activeElement === input) {
          (input as HTMLElement).blur();
        }
      }
      // Call the original onBlur if provided
      onBlur?.(layout, extraProps, details);
    },
    trackChildren: true,
    ...props
  });

  React.useEffect(() => {
    if (focused && ref.current) {
      ref.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [focused]);

  return (
    <div
      ref={ref}
      className={className}
      onClick={focusSelf}
      style={{ display: 'flex', outline: 'none' }}
    >
      {children(focused)}
    </div>
  );
};
