'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  MessageSquare,
  Shield,
  Plus,
  Edit,
  Trash2,
  Loader2,
  ArrowLeft,
  Save,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { useCategories } from '@/hooks/use-community';
import { useCreateCategory } from '@/hooks/use-admin';
import { formatNumber } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminCategoriesPage() {
  const router = useRouter();
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const { data: categoriesData, isLoading: categoriesLoading, refetch } = useCategories();
  const createCategory = useCreateCategory();

  const [isCreating, setIsCreating] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '',
  });

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && currentUser && currentUser.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [currentUser, authLoading, router]);

  const handleCreateCategory = async () => {
    if (!newCategory.name || !newCategory.slug) {
      toast.error('Name und Slug sind erforderlich');
      return;
    }

    try {
      await createCategory.mutateAsync(newCategory);
      toast.success('Kategorie erstellt');
      setNewCategory({ name: '', slug: '', description: '', icon: '' });
      setIsCreating(false);
      refetch();
    } catch (error) {
      toast.error('Fehler beim Erstellen der Kategorie');
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[äöüß]/g, (match) => {
        const replacements: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };
        return replacements[match] || match;
      })
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!currentUser || currentUser.role !== 'ADMIN') {
    return (
      <DashboardLayout>
        <Card className="flex flex-col items-center justify-center py-16">
          <Shield className="mb-4 h-16 w-16 text-destructive" />
          <h3 className="mb-2 text-xl font-semibold">Zugriff verweigert</h3>
          <Button asChild>
            <Link href="/dashboard">Zurück zum Dashboard</Link>
          </Button>
        </Card>
      </DashboardLayout>
    );
  }

  const categories = categoriesData?.categories || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back Link */}
        <Link
          href="/admin"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zum Admin Dashboard
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Kategorien verwalten</h1>
            <p className="text-muted-foreground">
              Erstelle und bearbeite Community-Kategorien
            </p>
          </div>
          <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
            <Plus className="mr-2 h-4 w-4" />
            Neue Kategorie
          </Button>
        </div>

        {/* Create Form */}
        {isCreating && (
          <Card>
            <CardHeader>
              <CardTitle>Neue Kategorie erstellen</CardTitle>
              <CardDescription>Fülle die Felder aus, um eine neue Kategorie zu erstellen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name *</label>
                  <Input
                    placeholder="z.B. Anfänger-Fragen"
                    value={newCategory.name}
                    onChange={(e) => {
                      setNewCategory({
                        ...newCategory,
                        name: e.target.value,
                        slug: generateSlug(e.target.value),
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Slug *</label>
                  <Input
                    placeholder="z.B. anfaenger-fragen"
                    value={newCategory.slug}
                    onChange={(e) => setNewCategory({ ...newCategory, slug: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Icon (Emoji)</label>
                  <Input
                    placeholder="z.B. 🌱"
                    value={newCategory.icon}
                    onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Beschreibung</label>
                <Textarea
                  placeholder="Kurze Beschreibung der Kategorie..."
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setNewCategory({ name: '', slug: '', description: '', icon: '' });
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Abbrechen
                </Button>
                <Button
                  onClick={handleCreateCategory}
                  disabled={createCategory.isPending}
                >
                  {createCategory.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Erstellen
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Categories List */}
        <Card>
          <CardHeader>
            <CardTitle>Vorhandene Kategorien ({categories.length})</CardTitle>
            <CardDescription>Liste aller Community-Kategorien</CardDescription>
          </CardHeader>
          <CardContent>
            {categoriesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : categories.length > 0 ? (
              <div className="space-y-3">
                {categories.map((category: any) => (
                  <div
                    key={category.id || category._id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-2xl">
                        {category.icon || '💬'}
                      </div>
                      <div>
                        <div className="font-semibold">{category.name}</div>
                        <div className="text-sm text-muted-foreground">
                          /{category.slug}
                        </div>
                        {category.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {category.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {formatNumber(category.threadCount || 0)} Threads
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatNumber(category.postCount || 0)} Beiträge
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <MessageSquare className="mb-2 h-8 w-8" />
                <p>Keine Kategorien vorhanden</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsCreating(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Erste Kategorie erstellen
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
