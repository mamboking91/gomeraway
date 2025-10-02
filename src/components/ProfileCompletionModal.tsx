import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';
import ProfileCompletion from './ProfileCompletion';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const handleComplete = () => {
    onComplete();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">Completa tu perfil</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Necesitamos algunos datos para procesar tu reserva
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <ProfileCompletion onComplete={handleComplete} isModal={true} />
      </DialogContent>
    </Dialog>
  );
};

export default ProfileCompletionModal;