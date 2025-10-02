import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Crown, AlertTriangle, CheckCircle, ArrowUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'react-router-dom';

interface LimitIndicatorProps {
  currentCount: number;
  maxAllowed: number;
  planName: string;
  isUnlimited: boolean;
  loading?: boolean;
}

const LimitIndicator: React.FC<LimitIndicatorProps> = ({
  currentCount,
  maxAllowed,
  planName,
  isUnlimited,
  loading = false,
}) => {
  const { t } = useLanguage();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-2 bg-muted rounded mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progressPercentage = isUnlimited ? 0 : (currentCount / maxAllowed) * 100;
  const isNearLimit = !isUnlimited && progressPercentage >= 80;
  const isAtLimit = !isUnlimited && currentCount >= maxAllowed;

  const getPlanColor = () => {
    switch (planName.toLowerCase()) {
      case 'básico':
      case 'basico':
        return 'text-blue-600';
      case 'premium':
        return 'text-purple-600';
      case 'diamante':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getPlanIcon = () => {
    switch (planName.toLowerCase()) {
      case 'diamante':
        return <Crown className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <Card className={`${isAtLimit ? 'border-red-200 bg-red-50' : isNearLimit ? 'border-yellow-200 bg-yellow-50' : ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {getPlanIcon()}
          <span className={getPlanColor()}>Plan {planName}</span>
          {isAtLimit && <AlertTriangle className="h-4 w-4 text-red-500" />}
          {!isAtLimit && !isNearLimit && <CheckCircle className="h-4 w-4 text-green-500" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Usage Display */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Anuncios activos</span>
            <span className="font-medium">
              {currentCount}
              {!isUnlimited && ` / ${maxAllowed}`}
              {isUnlimited && ' (Ilimitados)'}
            </span>
          </div>
          
          {!isUnlimited && (
            <Progress 
              value={progressPercentage} 
              className={`h-2 ${isAtLimit ? 'bg-red-100' : isNearLimit ? 'bg-yellow-100' : 'bg-green-100'}`}
            />
          )}
        </div>

        {/* Status Messages */}
        {isAtLimit && (
          <div className="p-3 bg-red-100 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 font-medium mb-2">
              ¡Has alcanzado tu límite!
            </p>
            <p className="text-xs text-red-700 mb-3">
              Mejora tu plan para crear más anuncios y obtener más visibilidad.
            </p>
            <Link to="/membership">
              <Button size="sm" className="w-full bg-red-600 hover:bg-red-700">
                <ArrowUp className="h-3 w-3 mr-1" />
                Mejorar Plan
              </Button>
            </Link>
          </div>
        )}

        {isNearLimit && !isAtLimit && (
          <div className="p-3 bg-yellow-100 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 font-medium mb-1">
              Cerca del límite
            </p>
            <p className="text-xs text-yellow-700 mb-2">
              Considera mejorar tu plan para no quedarte sin espacio.
            </p>
            <Link to="/membership">
              <Button size="sm" variant="outline" className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-50">
                <ArrowUp className="h-3 w-3 mr-1" />
                Ver Planes
              </Button>
            </Link>
          </div>
        )}

        {!isNearLimit && !isUnlimited && (
          <div className="text-xs text-muted-foreground">
            Tienes {maxAllowed - currentCount} anuncios disponibles
          </div>
        )}

        {isUnlimited && (
          <div className="p-3 bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800">
              <Crown className="h-4 w-4" />
              <span className="text-sm font-medium">Anuncios Ilimitados</span>
            </div>
            <p className="text-xs text-yellow-700 mt-1">
              Disfruta de todos los beneficios de tu plan Diamante
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LimitIndicator;