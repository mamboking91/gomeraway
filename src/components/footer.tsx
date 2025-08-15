import React from 'react';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const Footer = () => {
  const { t } = useLanguage();

  const footerSections = [
    {
      title: t('footer.explore'),
      links: [
        t('nav.accommodation'),
        t('nav.vehicles'),
        t('nav.experiences'),
        'Local Guides',
        'Island Tours',
      ],
    },
    {
      title: t('footer.support'),
      links: [
        'Help Center',
        'Contact Us',
        'Safety & Trust',
        'Cancellation Options',
        'Accessibility',
      ],
    },
    {
      title: t('footer.host'),
      links: [
        'List Your Property',
        'List Your Vehicle',
        'Host Resources',
        'Community Standards',
        'Superhost Program',
      ],
    },
    {
      title: t('footer.laGomera'),
      links: [
        'Weather',
        'Local Events',
        'Transportation',
        'Emergency Info',
        'Tourism Office',
      ],
    },
  ];

  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="text-2xl font-bold text-white mb-4">
              GomeraWay
            </div>
            <p className="text-gray-300 mb-4 max-w-sm">
              {t('footer.tagline')}
            </p>
            <div className="flex space-x-4">
              <Facebook className="h-5 w-5 text-gray-300 hover:text-white cursor-pointer transition-colors" />
              <Instagram className="h-5 w-5 text-gray-300 hover:text-white cursor-pointer transition-colors" />
              <Twitter className="h-5 w-5 text-gray-300 hover:text-white cursor-pointer transition-colors" />
            </div>
          </div>

          {/* Footer Links */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-white font-semibold mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-gray-300 hover:text-white transition-colors text-sm"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact Info */}
        <div className="border-t border-gray-600 mt-8 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center text-gray-300">
              <Mail className="h-4 w-4 mr-2" />
              <span className="text-sm">info@gomeraway.com</span>
            </div>
            <div className="flex items-center text-gray-300">
              <Phone className="h-4 w-4 mr-2" />
              <span className="text-sm">+34 922 XXX XXX</span>
            </div>
            <div className="flex items-center text-gray-300">
              <MapPin className="h-4 w-4 mr-2" />
              <span className="text-sm">La Gomera, Canary Islands</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-600 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-400 text-sm mb-4 md:mb-0">
            {t('footer.copyright')}
          </div>
          <div className="flex space-x-6 text-sm">
            <a href="#" className="text-gray-300 hover:text-white transition-colors">
              {t('footer.privacy')}
            </a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">
              {t('footer.terms')}
            </a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">
              {t('footer.cookies')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;