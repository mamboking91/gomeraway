import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Globe, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import AuthModal from './AuthModal'; // Importamos el nuevo modal

const Header = () => {
  const { language, setLanguage, t } = useLanguage();
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Obtenemos la sesión actual al cargar el componente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Escuchamos los cambios en el estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/'); // Redirigir a la página de inicio después de cerrar sesión
  };

  const navigation = [
    { name: t('nav.accommodation'), href: '#accommodation' },
    { name: t('nav.vehicles'), href: '#vehicles' },
    { name: t('nav.experiences'), href: '#experiences' },
    { name: t('nav.about'), href: '#about' },
  ];

  return (
    <>
      <header className="bg-white/95 backdrop-blur-sm border-b border-border sticky top-0 z-50 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                GomeraWay
              </div>
              <span className="text-sm text-muted-foreground hidden sm:block">
                {t('nav.discover')}
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navigation.map((item) => (
                <a key={item.name} href={item.href} className="text-foreground hover:text-primary font-medium transition-colors relative group py-2">
                  {item.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full"></span>
                </a>
              ))}
            </nav>

            {/* Right Side */}
            <div className="flex items-center space-x-4">
              {/* Language Selector */}
              <Select value={language} onValueChange={(value) => setLanguage(value as 'en' | 'es' | 'de')}>
                <SelectTrigger className="w-auto border-none bg-transparent shadow-none hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-1">
                    <Globe className="h-4 w-4" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">🇬🇧 English</SelectItem>
                  <SelectItem value="es">🇪🇸 Español</SelectItem>
                  <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
                </SelectContent>
              </Select>

              {/* Become a Host */}
              <Link to="/membership">
                <Button variant="ghost" className="hidden sm:flex items-center font-medium hover:bg-muted/50 transition-colors">
                  {t('nav.becomeHost')}
                </Button>
              </Link>

              {/* User Menu */}
              {session ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="rounded-full px-3 py-2 border border-border hover:bg-muted/50 transition-colors">
                      <User className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Cerrar sesión</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button onClick={() => setIsAuthModalOpen(true)} variant="outline" className="rounded-full px-3 py-2 border border-border hover:bg-muted/50 transition-colors">
                  <Menu className="h-4 w-4 mr-2" />
                  <User className="h-4 w-4" />
                </Button>
              )}

              {/* Mobile Menu */}
              <Sheet>
                {/* ... (código del menú móvil sin cambios) ... */}
              </Sheet>
            </div>
          </div>
        </div>
      </header>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
};

export default Header;
