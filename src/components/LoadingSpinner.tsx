import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text = 'Cargando...',
  className = '',
  fullScreen = false
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const containerClasses = fullScreen 
    ? 'fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50'
    : 'flex items-center justify-center py-8';

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="flex flex-col items-center space-y-2">
        <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
        {text && (
          <p className="text-sm text-muted-foreground animate-pulse">
            {text}
          </p>
        )}
      </div>
    </div>
  );
};

// Componentes especializados para diferentes contextos
export const PageLoader: React.FC<{ text?: string }> = ({ text = 'Cargando página...' }) => (
  <LoadingSpinner size="lg" text={text} fullScreen />
);

export const ComponentLoader: React.FC<{ text?: string }> = ({ text = 'Cargando...' }) => (
  <LoadingSpinner size="md" text={text} className="min-h-[200px]" />
);

export const InlineLoader: React.FC<{ text?: string }> = ({ text }) => (
  <LoadingSpinner size="sm" text={text} className="py-2" />
);

export default LoadingSpinner;