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

  // Pages
  'category.accommodation': { en: 'Accommodation', es: 'Alojamiento', de: 'Unterkünfte' },
  'pages.accommodationSubtitle': { en: 'Discover unique accommodations in the most pristine island of the Canaries', es: 'Descubre alojamientos únicos en la isla más virgen de Canarias', de: 'Entdecken Sie einzigartige Unterkünfte auf der unberührtesten Insel der Kanaren' },
  'pages.vehiclesSubtitle': { en: 'Rent vehicles to explore every corner of the island', es: 'Alquila vehículos para explorar cada rincón de la isla', de: 'Mieten Sie Fahrzeuge, um jeden Winkel der Insel zu erkunden' },
  'pages.loading': { en: 'Loading...', es: 'Cargando...', de: 'Wird geladen...' },
  'pages.error': { en: 'Error loading data.', es: 'Error al cargar los datos.', de: 'Fehler beim Laden der Daten.' },

  // About page
  'about.title': { en: 'About GomeraWay', es: 'Sobre GomeraWay', de: 'Über GomeraWay' },
  'about.subtitle': { en: 'We connect travelers with authentic La Gomera through unique and sustainable local experiences.', es: 'Conectamos viajeros con la auténtica La Gomera a través de experiencias locales únicas y sostenibles.', de: 'Wir verbinden Reisende mit dem authentischen La Gomera durch einzigartige und nachhaltige lokale Erlebnisse.' },
  'about.missionTitle': { en: 'Our Mission', es: 'Nuestra Misión', de: 'Unsere Mission' },
  'about.missionText1': { en: 'GomeraWay was born from the love for La Gomera and the desire to share its hidden treasures with travelers seeking authentic experiences. We believe in sustainable tourism that benefits both visitors and the local community.', es: 'GomeraWay nació del amor por La Gomera y el deseo de compartir sus tesoros ocultos con viajeros que buscan experiencias auténticas. Creemos en un turismo sostenible que beneficie tanto a visitantes como a la comunidad local.', de: 'GomeraWay entstand aus der Liebe zu La Gomera und dem Wunsch, seine verborgenen Schätze mit Reisenden zu teilen, die authentische Erlebnisse suchen. Wir glauben an nachhaltigen Tourismus, der sowohl Besuchern als auch der lokalen Gemeinschaft zugute kommt.' },
  'about.missionText2': { en: 'Every accommodation and vehicle on our platform has been carefully selected to guarantee quality, authenticity and respect for the environment.', es: 'Cada alojamiento y vehículo en nuestra plataforma ha sido cuidadosamente seleccionado para garantizar calidad, autenticidad y respeto por el medio ambiente.', de: 'Jede Unterkunft und jedes Fahrzeug auf unserer Plattform wurde sorgfältig ausgewählt, um Qualität, Authentizität und Respekt für die Umwelt zu gewährleisten.' },
  'about.localTitle': { en: 'Local', es: 'Local', de: 'Lokal' },
  'about.localDesc': { en: 'Deep knowledge of every corner of La Gomera', es: 'Conocimiento profundo de cada rincón de La Gomera', de: 'Tiefes Wissen über jeden Winkel von La Gomera' },
  'about.authenticTitle': { en: 'Authentic', es: 'Auténtico', de: 'Authentisch' },
  'about.authenticDesc': { en: 'Genuine experiences with Gomeran culture', es: 'Experiencias genuinas con la cultura gomera', de: 'Echte Erlebnisse mit der gomerischen Kultur' },
  'about.secureTitle': { en: 'Secure', es: 'Seguro', de: 'Sicher' },
  'about.secureDesc': { en: 'Reliable platform with host verification', es: 'Plataforma confiable con verificación de anfitriones', de: 'Zuverlässige Plattform mit Gastgeber-Verifizierung' },
  'about.communityTitle': { en: 'Community', es: 'Comunitario', de: 'Gemeinschaft' },
  'about.communityDesc': { en: 'We support La Gomera\'s local economy', es: 'Apoyamos a la economía local de La Gomera', de: 'Wir unterstützen die lokale Wirtschaft von La Gomera' },
  'about.whyGomeraTitle': { en: 'Why La Gomera?', es: '¿Por qué La Gomera?', de: 'Warum La Gomera?' },
  'about.whyGomeraText': { en: 'La Gomera is the hidden jewel of the Canary Islands. Its pristine nature, the Garajonay National Park declared a World Heritage Site, its ancestral traditions like the Gomeran whistle, and the warmth of its people make it a unique and unforgettable destination.', es: 'La Gomera es la joya oculta de las Islas Canarias. Su naturaleza virgen, el Parque Nacional de Garajonay declarado Patrimonio de la Humanidad, sus tradiciones ancestrales como el silbo gomero, y la calidez de su gente la convierten en un destino único e inolvidable.', de: 'La Gomera ist das verborgene Juwel der Kanarischen Inseln. Seine unberührte Natur, der Garajonay-Nationalpark, der zum Weltkulturerbe erklärt wurde, seine uralten Traditionen wie die gomerische Pfeifsprache und die Herzlichkeit seiner Menschen machen es zu einem einzigartigen und unvergesslichen Reiseziel.' },

  // Host Dashboard
  'host.noBookingsTitle': { en: 'No bookings yet', es: 'Sin reservas aún', de: 'Noch keine Buchungen' },
  'host.noBookingsDescription': { en: 'When guests book your listings, they will appear here for you to manage.', es: 'Cuando los huéspedes reserven tus anuncios, aparecerán aquí para que puedas gestionarlas.', de: 'Wenn Gäste Ihre Angebote buchen, erscheinen sie hier zur Verwaltung.' },
  'host.reservationsTitle': { en: 'My Reservations', es: 'Mis Reservas', de: 'Meine Reservierungen' },
  'host.totalBookings': { en: 'total bookings', es: 'reservas totales', de: 'Gesamtbuchungen' },
  'host.bookingStatusUpdated': { en: 'Booking status updated successfully', es: 'Estado de reserva actualizado correctamente', de: 'Buchungsstatus erfolgreich aktualisiert' },
  'host.bookingStatusError': { en: 'Error updating booking status', es: 'Error al actualizar el estado de la reserva', de: 'Fehler beim Aktualisieren des Buchungsstatus' },

  // Booking Status
  'booking.statusConfirmed': { en: 'Confirmed', es: 'Confirmada', de: 'Bestätigt' },
  'booking.statusPending': { en: 'Pending', es: 'Pendiente', de: 'Ausstehend' },
  'booking.statusCancelled': { en: 'Cancelled', es: 'Cancelada', de: 'Storniert' },
  'booking.statusRejected': { en: 'Rejected', es: 'Rechazada', de: 'Abgelehnt' },
  'booking.dates': { en: 'Booking Dates', es: 'Fechas de Reserva', de: 'Buchungsdaten' },
  'booking.nights': { en: 'nights', es: 'noches', de: 'Nächte' },
  'booking.totalPrice': { en: 'Total Price', es: 'Precio Total', de: 'Gesamtpreis' },
  'booking.depositStatus': { en: 'Deposit Status', es: 'Estado del Depósito', de: 'Einzahlungsstatus' },
  'booking.depositPaid': { en: 'Paid', es: 'Pagado', de: 'Bezahlt' },
  'booking.depositPending': { en: 'Pending', es: 'Pendiente', de: 'Ausstehend' },
  'booking.accept': { en: 'Accept', es: 'Aceptar', de: 'Akzeptieren' },
  'booking.reject': { en: 'Reject', es: 'Rechazar', de: 'Ablehnen' },
  'booking.createdAt': { en: 'Booking created', es: 'Reserva creada', de: 'Buchung erstellt' },

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