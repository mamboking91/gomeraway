import React from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { useLanguage } from '@/contexts/LanguageContext';
import { MapPin, Heart, Shield, Users } from 'lucide-react';

const AboutPage = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            {t('about.title')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('about.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-16">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-6">{t('about.missionTitle')}</h2>
            <p className="text-lg text-muted-foreground mb-6">
              {t('about.missionText1')}
            </p>
            <p className="text-lg text-muted-foreground">
              {t('about.missionText2')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="text-center p-6 bg-white rounded-2xl shadow-soft">
              <MapPin className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">{t('about.localTitle')}</h3>
              <p className="text-muted-foreground">
                {t('about.localDesc')}
              </p>
            </div>
            
            <div className="text-center p-6 bg-white rounded-2xl shadow-soft">
              <Heart className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">{t('about.authenticTitle')}</h3>
              <p className="text-muted-foreground">
                {t('about.authenticDesc')}
              </p>
            </div>
            
            <div className="text-center p-6 bg-white rounded-2xl shadow-soft">
              <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">{t('about.secureTitle')}</h3>
              <p className="text-muted-foreground">
                {t('about.secureDesc')}
              </p>
            </div>
            
            <div className="text-center p-6 bg-white rounded-2xl shadow-soft">
              <Users className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">{t('about.communityTitle')}</h3>
              <p className="text-muted-foreground">
                {t('about.communityDesc')}
              </p>
            </div>
          </div>
        </div>

        <div className="text-center bg-muted rounded-2xl p-12">
          <h2 className="text-3xl font-bold text-foreground mb-6">
            {t('about.whyGomeraTitle')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-4xl mx-auto">
            {t('about.whyGomeraText')}
          </p>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default AboutPage;