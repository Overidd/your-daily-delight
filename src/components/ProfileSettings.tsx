import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/profile';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Loader2, User } from 'lucide-react';

interface ProfileSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfileSettings = ({ open, onOpenChange }: ProfileSettingsProps) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadProfile();
    }
  }, [open, user]);

  const loadProfile = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      toast.error('Error al cargar el perfil');
      setLoading(false);
      return;
    }

    if (data) {
      setProfile(data as Profile);
      setFullName(data.full_name || '');
      setAvatarUrl(data.avatar_url || '');
    } else {
      // Create profile if doesn't exist
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (!createError && newProfile) {
        setProfile(newProfile as Profile);
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user || !profile) return;
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      })
      .eq('user_id', user.id);

    if (error) {
      toast.error('Error al guardar el perfil');
    } else {
      toast.success('Perfil actualizado');
      onOpenChange(false);
    }
    setSaving(false);
  };

  const getInitials = () => {
    if (fullName) {
      return fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configuración de Perfil</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarUrl} alt={fullName || 'Avatar'} />
                <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre completo</Label>
                <Input
                  id="fullName"
                  placeholder="Tu nombre"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatarUrl">URL del avatar</Label>
                <Input
                  id="avatarUrl"
                  placeholder="https://ejemplo.com/avatar.jpg"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
