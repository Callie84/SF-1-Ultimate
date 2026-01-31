'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  User,
  Mail,
  Calendar,
  Sprout,
  Award,
  Edit,
  Save,
  X,
  Loader2,
  Camera
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { useGrows } from '@/hooks/use-journal';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/lib/api-client';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { data: growsData, isLoading: growsLoading } = useGrows();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    bio: user?.bio || '',
  });

  const grows = growsData?.grows || [];
  const totalEntries = grows.reduce((sum: number, g: any) =>
    sum + (g.stats?.totalEntries || g.entryCount || 0), 0
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.patch('/api/auth/profile', formData);
      toast.success('Profil erfolgreich aktualisiert');
      setIsEditing(false);
      if (refreshUser) {
        await refreshUser();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      displayName: user?.displayName || '',
      bio: user?.bio || '',
    });
    setIsEditing(false);
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mein Profil</h1>
            <p className="text-muted-foreground">
              Verwalte deine Profil-Informationen
            </p>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Bearbeiten
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                <X className="mr-2 h-4 w-4" />
                Abbrechen
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Speichern
              </Button>
            </div>
          )}
        </div>

        {/* Profile Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
              {/* Avatar */}
              <div className="relative">
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary/10 text-primary text-4xl font-bold">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    user.username?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
                {isEditing && (
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-0 right-0 rounded-full"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 space-y-4 text-center md:text-left">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Anzeigename</label>
                      <Input
                        value={formData.displayName}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        placeholder="Dein Anzeigename"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Bio</label>
                      <Textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        placeholder="Erzähl etwas über dich..."
                        rows={3}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <h2 className="text-2xl font-bold">
                        {user.displayName || user.username}
                      </h2>
                      <p className="text-muted-foreground">@{user.username}</p>
                    </div>
                    {user.bio && (
                      <p className="text-muted-foreground">{user.bio}</p>
                    )}
                  </>
                )}

                {/* Meta Info */}
                <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground md:justify-start">
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {user.email}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Dabei seit {formatDate(new Date(user.createdAt))}
                  </div>
                  {user.isVerified && (
                    <div className="flex items-center gap-1 text-green-500">
                      <Award className="h-4 w-4" />
                      Verifiziert
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Grows</CardTitle>
              <Sprout className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {growsLoading ? '...' : grows.length}
              </div>
              <p className="text-xs text-muted-foreground">Grow-Projekte</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Einträge</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {growsLoading ? '...' : totalEntries}
              </div>
              <p className="text-xs text-muted-foreground">Journal-Einträge</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rolle</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user.role}</div>
              <p className="text-xs text-muted-foreground">Account-Typ</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Grows */}
        <Card>
          <CardHeader>
            <CardTitle>Meine Grows</CardTitle>
            <CardDescription>Deine letzten Grow-Projekte</CardDescription>
          </CardHeader>
          <CardContent>
            {growsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : grows.length > 0 ? (
              <div className="space-y-3">
                {grows.slice(0, 5).map((grow: any) => (
                  <div
                    key={grow.id || grow._id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10">
                        <Sprout className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {grow.strainName || grow.strain?.name || 'Unbenannt'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {grow.status} • {grow.stats?.totalEntries || 0} Einträge
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`/journal/${grow.id || grow._id}`}>Öffnen</a>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Noch keine Grows vorhanden
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
