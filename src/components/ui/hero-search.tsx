import React, { useState } from 'react';
import { Search, MapPin, Calendar, Users, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';

const HeroSearch = () => {
  const { t } = useLanguage();
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [guests, setGuests] = useState('2');
  const [searchType, setSearchType] = useState('accommodation');

  return (
    <div className="bg-white rounded-2xl shadow-strong p-6 max-w-5xl mx-auto">
      {/* Search Type Tabs */}
      <div className="flex mb-6 bg-muted rounded-xl p-1">
        <button
          onClick={() => setSearchType('accommodation')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
            searchType === 'accommodation'
              ? 'bg-white shadow-soft text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          🏠 {t('search.accommodation')}
        </button>
        <button
          onClick={() => setSearchType('vehicles')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
            searchType === 'vehicles'
              ? 'bg-white shadow-soft text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          🚗 {t('search.vehicles')}
        </button>
      </div>

      {/* Search Form */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Location */}
        <div className="relative">
          <label className="block text-sm font-medium text-foreground mb-2">
            <MapPin className="inline w-4 h-4 mr-1" />
            {searchType === 'accommodation' ? t('search.where') : t('search.pickupLocation')}
          </label>
          <Input
            placeholder={searchType === 'accommodation' ? t('search.searchDestinations') : t('search.searchLocations')}
            className="pl-4"
          />
        </div>

        {/* Check-in / Pick-up Date */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            <Calendar className="inline w-4 h-4 mr-1" />
            {searchType === 'accommodation' ? t('search.checkIn') : t('search.pickup')}
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                {checkIn ? format(checkIn, 'MMM d, yyyy') : t('search.selectDate')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={checkIn}
                onSelect={setCheckIn}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Check-out / Return Date */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            <Calendar className="inline w-4 h-4 mr-1" />
            {searchType === 'accommodation' ? t('search.checkOut') : t('search.return')}
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                {checkOut ? format(checkOut, 'MMM d, yyyy') : t('search.selectDate')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={checkOut}
                onSelect={setCheckOut}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Guests / Vehicle Type */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {searchType === 'accommodation' ? (
              <>
                <Users className="inline w-4 h-4 mr-1" />
                {t('search.guests')}
              </>
            ) : (
              <>
                <Car className="inline w-4 h-4 mr-1" />
                {t('search.vehicleType')}
              </>
            )}
          </label>
          {searchType === 'accommodation' ? (
            <Select value={guests} onValueChange={setGuests}>
              <SelectTrigger>
                <SelectValue placeholder={t('search.selectGuests')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">{t('guests.1')}</SelectItem>
                <SelectItem value="2">{t('guests.2')}</SelectItem>
                <SelectItem value="3">{t('guests.3')}</SelectItem>
                <SelectItem value="4">{t('guests.4')}</SelectItem>
                <SelectItem value="5">{t('guests.5')}</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Select>
              <SelectTrigger>
                <SelectValue placeholder={t('search.vehicleTypeSelect')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="car">{t('vehicle.car')}</SelectItem>
                <SelectItem value="suv">{t('vehicle.suv')}</SelectItem>
                <SelectItem value="van">{t('vehicle.van')}</SelectItem>
                <SelectItem value="motorcycle">{t('vehicle.motorcycle')}</SelectItem>
                <SelectItem value="bike">{t('vehicle.bike')}</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Search Button */}
      <div className="mt-6 text-center">
        <Button className="bg-gradient-primary hover:opacity-90 px-12 py-3 text-lg font-semibold rounded-xl shadow-medium hover:shadow-strong transition-all">
          <Search className="mr-2 h-5 w-5" />
          {t('search.search')}
        </Button>
      </div>
    </div>
  );
};

export default HeroSearch;