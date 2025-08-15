import React from 'react';
import { Link } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import Header from '@/components/header';
import Footer from '@/components/footer';

const PaymentCancelledPage = () => (
  <div className="min-h-screen flex flex-col">
    <Header />
    <main className="flex-grow flex items-center justify-center text-center px-4">
      <div>
        <XCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-3xl font-bold mb-2">Pago Cancelado</h1>
        <p className="text-muted-foreground mb-6">Tu proceso de pago ha sido cancelado. No se ha realizado ningún cargo.</p>
        <Link to="/membership" className="text-primary hover:underline">
          Volver a intentar
        </Link>
      </div>
    </main>
    <Footer />
  </div>
);

export default PaymentCancelledPage;