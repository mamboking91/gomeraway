import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, User, Phone, MapPin, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ProfileCompletionProps {
  onComplete?: () => void;
  isModal?: boolean;
}

const COUNTRIES = [
  'España',
  'Alemania', 
  'Francia',
  'Reino Unido',
  'Italia',
  'Portugal',
  'Países Bajos',
  'Otro'
];

const ProfileCompletion: React.FC<ProfileCompletionProps> = ({ 
  onComplete, 
  isModal = false 
}) => {
  const { profile, updateProfile, loading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    city: profile?.city || '',
    country: profile?.country || '',
    birth_day: profile?.date_of_birth ? new Date(profile.date_of_birth).getDate().toString() : '',
    birth_month: profile?.date_of_birth ? (new Date(profile.date_of_birth).getMonth() + 1).toString() : '',
    birth_year: profile?.date_of_birth ? new Date(profile.date_of_birth).getFullYear().toString() : '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Generar arrays para los selectores
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = [
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - 18 - i).toString());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validar campos requeridos
      const requiredFields = ['full_name', 'phone', 'address', 'city', 'country', 'birth_day', 'birth_month', 'birth_year'];
      const missingFields = requiredFields.filter(field => 
        !formData[field as keyof typeof formData] || 
        formData[field as keyof typeof formData] === ''
      );

      if (missingFields.length > 0) {
        toast.error('Por favor, completa todos los campos requeridos');
        setSaving(false);
        return;
      }

      // Crear fecha de nacimiento
      const birthDate = new Date(
        parseInt(formData.birth_year),
        parseInt(formData.birth_month) - 1,
        parseInt(formData.birth_day)
      );

      // Validar que la fecha sea válida
      if (isNaN(birthDate.getTime())) {
        toast.error('Por favor, selecciona una fecha de nacimiento válida');
        setSaving(false);
        return;
      }

      // Validar edad mínima (18 años)
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (age < 18 || (age === 18 && monthDiff < 0) || 
          (age === 18 && monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        toast.error('Debes ser mayor de 18 años para usar la plataforma');
        setSaving(false);
        return;
      }

      // Actualizar perfil
      await updateProfile({
        full_name: formData.full_name,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        country: formData.country,
        date_of_birth: birthDate.toISOString().split('T')[0],
        profile_completed: true,
      });

      toast.success('Perfil completado exitosamente');
      onComplete?.();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = () => {
    return formData.full_name && 
           formData.phone && 
           formData.address && 
           formData.city && 
           formData.country && 
           formData.birth_day &&
           formData.birth_month &&
           formData.birth_year;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card className={cn("w-full max-w-2xl", isModal && "border-0 shadow-none")}>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <User className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Información Personal</CardTitle>
        <CardDescription>
          Completa los datos necesarios para tu perfil
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Personal */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <User className="h-4 w-4" />
              Información Personal
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nombre completo *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  placeholder="Tu nombre completo"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Fecha de nacimiento *</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Select 
                      value={formData.birth_day} 
                      onValueChange={(value) => handleInputChange('birth_day', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Día" />
                      </SelectTrigger>
                      <SelectContent>
                        {days.map((day) => (
                          <SelectItem key={day} value={day}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Select 
                      value={formData.birth_month} 
                      onValueChange={(value) => handleInputChange('birth_month', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Mes" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Select 
                      value={formData.birth_year} 
                      onValueChange={(value) => handleInputChange('birth_year', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Año" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Debes ser mayor de 18 años para usar la plataforma
                </p>
              </div>
            </div>
          </div>

          {/* Información de Contacto */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Phone className="h-4 w-4" />
              Información de Contacto
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+34 666 777 888"
                required
              />
            </div>
          </div>

          {/* Dirección */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <MapPin className="h-4 w-4" />
              Dirección
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Dirección completa *</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Calle, número, código postal..."
                  rows={2}
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Tu ciudad"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="country">País *</Label>
                  <Select 
                    value={formData.country} 
                    onValueChange={(value) => handleInputChange('country', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona país" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-6">
            <Button
              type="submit"
              disabled={!isFormValid() || saving}
              className="w-full"
              size="lg"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Completar Perfil
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProfileCompletion;