import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Map de rutas y sus componentes lazy
const routePreloadMap = {
  '/': {
    preload: ['/dashboard/host', '/dashboard/user'], // Usuarios logueados van frecuentemente aquí
    delay: 2000 // 2 segundos después de cargar
  },
  '/dashboard/host': {
    preload: ['/listings/create', '/admin'], // Hosts frecuentemente crean listings
    delay: 1000
  },
  '/dashboard/user': {
    preload: ['/accommodation', '/vehicles'], // Users buscan alojamientos
    delay: 1000
  },
  '/admin': {
    preload: ['/admin/analytics', '/admin/users', '/admin/listings'], // Admin usa estas frecuentemente
    delay: 500
  }
};

// Componentes lazy para precargar
const lazyComponents = {
  '/membership': () => import('../pages/MembershipPage'),
  '/payment/success': () => import('../pages/PaymentSuccessPage'),
  '/payment/cancelled': () => import('../pages/PaymentCancelledPage'),
  '/accommodation': () => import('../pages/AccommodationPage'),
  '/vehicles': () => import('../pages/VehiclesPage'),
  '/about': () => import('../pages/AboutPage'),
  '/dashboard/host': () => import('../pages/HostDashboard'),
  '/dashboard/user': () => import('../pages/UserDashboard'),
  '/subscription': () => import('../pages/SubscriptionManagement'),
  '/listings/create': () => import('../pages/CreateListing'),
  '/listings/edit/:id': () => import('../pages/EditListing'),
  '/admin': () => import('../pages/admin/AdminDashboard'),
  '/admin/subscriptions': () => import('../pages/admin/SubscriptionsManager'),
  '/admin/listings': () => import('../pages/admin/ListingsManager'),
  '/admin/bookings': () => import('../pages/admin/BookingsManager'),
  '/admin/users': () => import('../pages/admin/UsersManager'),
  '/admin/analytics': () => import('../pages/admin/AnalyticsDashboard'),
};

export const useRoutePreloading = () => {
  const location = useLocation();

  useEffect(() => {
    const currentRoute = location.pathname;
    const preloadConfig = routePreloadMap[currentRoute as keyof typeof routePreloadMap];

    if (preloadConfig) {
      const timeoutId = setTimeout(() => {
        preloadConfig.preload.forEach(route => {
          const componentLoader = lazyComponents[route as keyof typeof lazyComponents];
          if (componentLoader) {
            // Precargar componente sin bloquear
            componentLoader().catch(() => {
              // Silently fail - no es crítico
            });
          }
        });
      }, preloadConfig.delay);

      return () => clearTimeout(timeoutId);
    }
  }, [location.pathname]);
};

// Hook para precargar rutas específicas manualmente
export const usePreloadRoute = () => {
  const preloadRoute = (routePath: string) => {
    const componentLoader = lazyComponents[routePath as keyof typeof lazyComponents];
    if (componentLoader) {
      return componentLoader();
    }
    return Promise.resolve();
  };

  return { preloadRoute };
};

// Hook para precargar al hacer hover en enlaces
export const useHoverPreload = () => {
  const preloadOnHover = (routePath: string) => {
    let timeoutId: NodeJS.Timeout;

    const handleMouseEnter = () => {
      timeoutId = setTimeout(() => {
        const componentLoader = lazyComponents[routePath as keyof typeof lazyComponents];
        if (componentLoader) {
          componentLoader().catch(() => {
            // Silently fail
          });
        }
      }, 100); // 100ms delay para evitar precargas accidentales
    };

    const handleMouseLeave = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    return {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    };
  };

  return { preloadOnHover };
};

// Estadísticas de precarga (para debugging)
export const usePreloadStats = () => {
  const getPreloadedRoutes = () => {
    // En un caso real, esto podría trackear qué rutas han sido precargadas
    return Object.keys(lazyComponents).filter(route => {
      // Verificar si el módulo ya está en caché
      // Esto es una aproximación - en producción usarías APIs específicas del bundler
      return false; // Placeholder
    });
  };

  return { getPreloadedRoutes };
};

export default useRoutePreloading;