import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, PartyPopper } from 'lucide-react';
import Header from '@/components/header';
import Footer from '@/components/footer';

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type'); // 'subscription' o 'booking'

  const content = {
    subscription: {
      icon: <PartyPopper className="mx-auto h-16 w-16 text-green-500 mb-4" />,
      title: '¡Suscripción Activada!',
      message: 'Gracias por unirte a GomeraWay. Ya puedes empezar a crear tus anuncios.',
      linkText: 'Ir a mi panel',
      linkTo: '/dashboard', // En el futuro, esta será la ruta al panel del anfitrión
    },
    booking: {
      icon: <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />,
      title: '¡Reserva Confirmada!',
      message: 'Tu pago ha sido procesado. Recibirás un correo con los detalles de tu reserva.',
      linkText: 'Ver mis reservas',
      linkTo: '/my-bookings', // En el futuro, esta será la ruta a las reservas del usuario
    },
  };

  const currentContent = type === 'subscription' ? content.subscription : content.booking;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center text-center px-4">
        <div>
          {currentContent.icon}
          <h1 className="text-3xl font-bold mb-2">{currentContent.title}</h1>
          <p className="text-muted-foreground mb-6">{currentContent.message}</p>
          <Link to={currentContent.linkTo} className="text-primary hover:underline">
            {currentContent.linkText}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentSuccessPage;
