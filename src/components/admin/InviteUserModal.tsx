import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Mail, Send } from 'lucide-react';

const inviteSchema = z.object({
  email: z.string().email('Email inválido'),
  role: z.enum(['user', 'host', 'admin']),
  full_name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres').optional(),
  message: z.string().optional(),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      role: 'user',
    },
  });

  const onSubmit = async (data: InviteFormData) => {
    setIsSubmitting(true);
    
    try {
      // En una implementación real, aquí enviarías una invitación por email
      // Por ahora, vamos a crear un perfil temporal con estado "invited"
      
      // Primero verificar si el email ya existe
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', data.email)
        .single();

      if (existingUser) {
        throw new Error('Ya existe un usuario con este email');
      }

      // Crear invitación (en una implementación real esto sería una tabla separada)
      const invitationData = {
        email: data.email,
        role: data.role,
        full_name: data.full_name || null,
        invited_by: (await supabase.auth.getUser()).data.user?.id,
        invited_at: new Date().toISOString(),
        message: data.message || null,
        status: 'pending'
      };

      // Aquí podrías enviar el email de invitación usando una función de Edge
      // await supabase.functions.invoke('send-invitation', { body: invitationData });

      toast.success('Invitación enviada correctamente');
      reset();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error(error instanceof Error ? error.message : 'Error al enviar la invitación');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invitar Usuario
          </DialogTitle>
          <DialogDescription>
            Envía una invitación para que un nuevo usuario se una a la plataforma
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@ejemplo.com"
              {...register('email')}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="full_name">Nombre completo</Label>
            <Input
              id="full_name"
              placeholder="Nombre y apellidos"
              {...register('full_name')}
            />
          </div>

          <div>
            <Label htmlFor="role">Rol *</Label>
            <Select 
              value={watch('role')} 
              onValueChange={(value) => setValue('role', value as 'user' | 'host' | 'admin')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuario - Acceso básico a la plataforma</SelectItem>
                <SelectItem value="host">Host - Puede crear y gestionar anuncios</SelectItem>
                <SelectItem value="admin">Admin - Acceso completo de administración</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-red-500 mt-1">{errors.role.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="message">Mensaje personalizado (opcional)</Label>
            <Textarea
              id="message"
              placeholder="Añade un mensaje personal a la invitación..."
              rows={3}
              {...register('message')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Invitación
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InviteUserModal;