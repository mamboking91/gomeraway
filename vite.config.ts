import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimizaciones de bundle
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
      },
    },
    rollupOptions: {
      output: {
        // Estrategia de code splitting optimizada
        manualChunks: {
          // Vendor libraries principales
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-accordion', '@radix-ui/react-alert-dialog', '@radix-ui/react-dialog'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-form': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-date': ['date-fns'],
          'vendor-icons': ['lucide-react'],
          
          // Admin panel (chunk pesado)
          'admin': [
            './src/pages/admin/AdminDashboard',
            './src/pages/admin/AnalyticsDashboard',
            './src/pages/admin/SubscriptionsManager',
            './src/pages/admin/ListingsManager',
            './src/pages/admin/BookingsManager',
            './src/pages/admin/UsersManager'
          ],
          
          // Dashboard de usuarios
          'dashboard': [
            './src/pages/HostDashboard',
            './src/pages/UserDashboard',
            './src/pages/CreateListing',
            './src/pages/EditListing'
          ],
          
          // Páginas de contenido
          'content': [
            './src/pages/AccommodationPage',
            './src/pages/VehiclesPage',
            './src/pages/AboutPage',
            './src/pages/MembershipPage'
          ]
        },
        // Nombres de archivo más limpios
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop().replace('.tsx', '').replace('.ts', '') : 'chunk';
          return `assets/${facadeModuleId}-[hash].js`;
        },
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Límite de chunk para warnings
    chunkSizeWarningLimit: 500, // 500KB warning
    // Optimización de assets
    assetsInlineLimit: 4096, // 4KB - inline smaller assets
  },
  // Optimizar dependencias en desarrollo
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'date-fns',
      'lucide-react'
    ]
  }
}));
