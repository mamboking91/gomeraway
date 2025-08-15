import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'es' | 'de';

interface Translations {
  [key: string]: {
    [lang in Language]: string;
  };
}

const translations: Translations = {
  // Header
  'nav.accommodation': { en: 'Accommodation', es: 'Alojamiento', de: 'Unterkünfte' },
  'nav.vehicles': { en: 'Vehicles', es: 'Vehículos', de: 'Fahrzeuge' },
  'nav.experiences': { en: 'Experiences', es: 'Experiencias', de: 'Erlebnisse' },
  'nav.about': { en: 'About La Gomera', es: 'Sobre La Gomera', de: 'Über La Gomera' },
  'nav.becomeHost': { en: 'Become a Host', es: 'Ser Anfitrión', de: 'Gastgeber werden' },
  'nav.discover': { en: 'Discover La Gomera', es: 'Descubre La Gomera', de: 'Entdecke La Gomera' },

  // Hero Section
  'hero.title': { en: 'Discover La Gomera', es: 'Descubre La Gomera', de: 'Entdecke La Gomera' },
  'hero.subtitle': { en: 'Find your perfect stay and explore the island with our vehicle rentals', es: 'Encuentra tu estancia perfecta y explora la isla con nuestros alquileres de vehículos', de: 'Finden Sie Ihren perfekten Aufenthalt und erkunden Sie die Insel mit unseren Fahrzeugvermietungen' },

  // Search
  'search.accommodation': { en: 'Accommodation', es: 'Alojamiento', de: 'Unterkünfte' },
  'search.vehicles': { en: 'Vehicles', es: 'Vehículos', de: 'Fahrzeuge' },
  'search.where': { en: 'Where', es: 'Dónde', de: 'Wo' },
  'search.pickupLocation': { en: 'Pick-up location', es: 'Lugar de recogida', de: 'Abholort' },
  'search.checkIn': { en: 'Check-in', es: 'Entrada', de: 'Anreise' },
  'search.checkOut': { en: 'Check-out', es: 'Salida', de: 'Abreise' },
  'search.pickup': { en: 'Pick-up', es: 'Recogida', de: 'Abholung' },
  'search.return': { en: 'Return', es: 'Devolución', de: 'Rückgabe' },
  'search.guests': { en: 'Guests', es: 'Huéspedes', de: 'Gäste' },
  'search.vehicleType': { en: 'Vehicle type', es: 'Tipo de vehículo', de: 'Fahrzeugtyp' },
  'search.searchDestinations': { en: 'Search destinations', es: 'Buscar destinos', de: 'Reiseziele suchen' },
  'search.searchLocations': { en: 'Search locations', es: 'Buscar ubicaciones', de: 'Standorte suchen' },
  'search.selectDate': { en: 'Select date', es: 'Seleccionar fecha', de: 'Datum wählen' },
  'search.selectGuests': { en: 'Select guests', es: 'Seleccionar huéspedes', de: 'Gäste wählen' },
  'search.vehicleTypeSelect': { en: 'Vehicle type', es: 'Tipo de vehículo', de: 'Fahrzeugtyp' },
  'search.search': { en: 'Search', es: 'Buscar', de: 'Suchen' },

  // Guest options
  'guests.1': { en: '1 guest', es: '1 huésped', de: '1 Gast' },
  'guests.2': { en: '2 guests', es: '2 huéspedes', de: '2 Gäste' },
  'guests.3': { en: '3 guests', es: '3 huéspedes', de: '3 Gäste' },
  'guests.4': { en: '4 guests', es: '4 huéspedes', de: '4 Gäste' },
  'guests.5': { en: '5+ guests', es: '5+ huéspedes', de: '5+ Gäste' },

  // Vehicle types
  'vehicle.car': { en: 'Car', es: 'Coche', de: 'Auto' },
  'vehicle.suv': { en: 'SUV', es: 'SUV', de: 'SUV' },
  'vehicle.van': { en: 'Van', es: 'Furgoneta', de: 'Van' },
  'vehicle.motorcycle': { en: 'Motorcycle', es: 'Motocicleta', de: 'Motorrad' },
  'vehicle.bike': { en: 'Bike', es: 'Bicicleta', de: 'Fahrrad' },

  // Categories
  'category.all': { en: 'All', es: 'Todo', de: 'Alle' },
  'category.stays': { en: 'Stays', es: 'Estancias', de: 'Aufenthalte' },
  'category.vehicles': { en: 'Vehicles', es: 'Vehículos', de: 'Fahrzeuge' },

  // Listings
  'listing.book': { en: 'Book', es: 'Reservar', de: 'Buchen' },
  'listing.rent': { en: 'Rent', es: 'Alquilar', de: 'Mieten' },
  'listing.night': { en: ' / night', es: ' / noche', de: ' / Nacht' },
  'listing.day': { en: ' / day', es: ' / día', de: ' / Tag' },
  'listing.guests': { en: 'guests', es: 'huéspedes', de: 'Gäste' },
  'listing.bedrooms': { en: 'bedrooms', es: 'dormitorios', de: 'Schlafzimmer' },
  'listing.bathrooms': { en: 'bathrooms', es: 'baños', de: 'Badezimmer' },
  'listing.seats': { en: 'seats', es: 'asientos', de: 'Sitzplätze' },
  'listing.hostedBy': { en: 'Hosted by', es: 'Anfitrión:', de: 'Gastgeber:' },

  // Main page
  'main.exploreTitle': { en: 'Explore La Gomera Your Way', es: 'Explora La Gomera a Tu Manera', de: 'Erkunde La Gomera auf Deine Art' },
  'main.exploreSubtitle': { en: 'From cozy accommodations to reliable vehicles, everything you need for the perfect island experience', es: 'Desde alojamientos acogedores hasta vehículos confiables, todo lo que necesitas para la experiencia perfecta en la isla', de: 'Von gemütlichen Unterkünften bis hin zu zuverlässigen Fahrzeugen, alles was Sie für das perfekte Inselerlebnis brauchen' },
  'main.showMore': { en: 'Show More Listings', es: 'Mostrar Más Listados', de: 'Mehr Angebote anzeigen' },
  'main.whyChoose': { en: 'Why Choose GomeraWay?', es: '¿Por Qué Elegir GomeraWay?', de: 'Warum GomeraWay wählen?' },

  // Features
  'features.localTitle': { en: 'Local Expertise', es: 'Experiencia Local', de: 'Lokale Expertise' },
  'features.localDesc': { en: 'Curated by locals who know La Gomera\'s hidden gems and best experiences', es: 'Curado por locales que conocen las joyas ocultas y mejores experiencias de La Gomera', de: 'Zusammengestellt von Einheimischen, die La Gomeras versteckte Schätze und beste Erlebnisse kennen' },
  'features.trustedTitle': { en: 'Trusted & Verified', es: 'Confiable y Verificado', de: 'Vertrauenswürdig & Verifiziert' },
  'features.trustedDesc': { en: 'All hosts and vehicles are verified for your safety and peace of mind', es: 'Todos los anfitriones y vehículos están verificados para tu seguridad y tranquilidad', de: 'Alle Gastgeber und Fahrzeuge sind für Ihre Sicherheit und Ihren Seelenfrieden verifiziert' },
  'features.sustainableTitle': { en: 'Sustainable Tourism', es: 'Turismo Sostenible', de: 'Nachhaltiger Tourismus' },
  'features.sustainableDesc': { en: 'Supporting local communities and eco-friendly tourism practices', es: 'Apoyando a las comunidades locales y prácticas de turismo ecológico', de: 'Unterstützung lokaler Gemeinschaften und umweltfreundlicher Tourismuspraktiken' },

  // Footer
  'footer.tagline': { en: 'Your gateway to La Gomera. Discover authentic accommodations and reliable vehicle rentals on this pristine Canary Island paradise.', es: 'Tu puerta de entrada a La Gomera. Descubre alojamientos auténticos y alquileres de vehículos confiables en este paraíso prístino de las Islas Canarias.', de: 'Ihr Tor zu La Gomera. Entdecken Sie authentische Unterkünfte und zuverlässige Fahrzeugvermietungen auf diesem unberührten Kanarischen Inselparadies.' },
  'footer.explore': { en: 'Explore', es: 'Explorar', de: 'Erkunden' },
  'footer.support': { en: 'Support', es: 'Soporte', de: 'Support' },
  'footer.host': { en: 'Host', es: 'Anfitrión', de: 'Gastgeber' },
  'footer.laGomera': { en: 'La Gomera', es: 'La Gomera', de: 'La Gomera' },
  'footer.copyright': { en: '© 2024 GomeraWay. All rights reserved.', es: '© 2024 GomeraWay. Todos los derechos reservados.', de: '© 2024 GomeraWay. Alle Rechte vorbehalten.' },
  'footer.privacy': { en: 'Privacy Policy', es: 'Política de Privacidad', de: 'Datenschutzrichtlinie' },
  'footer.terms': { en: 'Terms of Service', es: 'Términos de Servicio', de: 'Nutzungsbedingungen' },
  'footer.cookies': { en: 'Cookie Policy', es: 'Política de Cookies', de: 'Cookie-Richtlinie' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};