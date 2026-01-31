'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, MessageSquare, X } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useCategories, useCreateThread } from '@/hooks/use-community';

const createThreadSchema = z.object({
  title: z.string().min(5, 'Titel muss mindestens 5 Zeichen haben').max(200, 'Titel zu lang'),
  content: z.string().min(20, 'Inhalt muss mindestens 20 Zeichen haben'),
  categoryId: z.string().min(1, 'Bitte wähle eine Kategorie'),
  tags: z.array(z.string()).optional(),
});

type CreateThreadFormData = z.infer<typeof createThreadSchema>;

function NewThreadForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCategory = searchParams.get('category');

  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();
  const createThread = useCreateThread();
  const isLoading = createThread.isPending;

  const categories = categoriesData?.categories || [];

  // Find preselected category ID
  const preselectedCategoryId = preselectedCategory
    ? categories.find((c: any) => c.slug === preselectedCategory)?.id ||
      categories.find((c: any) => c.slug === preselectedCategory)?._id
    : '';

  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateThreadFormData>({
    resolver: zodResolver(createThreadSchema),
    defaultValues: {
      title: '',
      content: '',
      categoryId: preselectedCategoryId || '',
      tags: [],
    },
  });

  // Update categoryId when categories load
  if (preselectedCategoryId && !watch('categoryId')) {
    setValue('categoryId', preselectedCategoryId);
  }

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 5) {
      const newTags = [...tags, trimmedTag];
      setTags(newTags);
      setValue('tags', newTags);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(newTags);
    setValue('tags', newTags);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const onSubmit = async (data: CreateThreadFormData) => {
    try {
      const result = await createThread.mutateAsync({
        title: data.title,
        content: data.content,
        categoryId: data.categoryId,
        tags: tags.length > 0 ? tags : undefined,
      });
      toast.success('Thread erfolgreich erstellt!');
      router.push(`/community/thread/${result.thread?.id || result.thread?._id}`);
    } catch (error: any) {
      console.error('Create thread error:', error);
      const message = error?.response?.data?.error || 'Fehler beim Erstellen des Threads';
      toast.error(message);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back Link */}
      <Link
        href="/community"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Zurück zur Community
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Neuer Thread</h1>
        <p className="text-muted-foreground">
          Starte eine neue Diskussion in der Community
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Category & Title */}
        <Card>
          <CardHeader>
            <CardTitle>Thread-Details</CardTitle>
            <CardDescription>
              Wähle eine Kategorie und gib deinem Thread einen aussagekräftigen Titel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Kategorie *</label>
              {categoriesLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Lade Kategorien...
                </div>
              ) : (
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...register('categoryId')}
                  disabled={isLoading}
                >
                  <option value="">Kategorie wählen...</option>
                  {categories.map((category: any) => (
                    <option key={category.id || category._id} value={category.id || category._id}>
                      {category.icon || '💬'} {category.name}
                    </option>
                  ))}
                </select>
              )}
              {errors.categoryId && (
                <p className="text-sm text-destructive">{errors.categoryId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Titel *</label>
              <Input
                placeholder="z.B. Wie bekomme ich mehr Ertrag in der Blütephase?"
                {...register('title')}
                disabled={isLoading}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle>Inhalt</CardTitle>
            <CardDescription>
              Beschreibe dein Anliegen so detailliert wie möglich
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Deine Nachricht *</label>
              <Textarea
                placeholder="Beschreibe dein Thema, deine Frage oder teile dein Wissen..."
                rows={10}
                {...register('content')}
                disabled={isLoading}
              />
              {errors.content && (
                <p className="text-sm text-destructive">{errors.content.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Tags (optional)</CardTitle>
            <CardDescription>
              Füge bis zu 5 Tags hinzu, um deinen Thread besser auffindbar zu machen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Tag eingeben..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                disabled={isLoading || tags.length >= 5}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTag}
                disabled={isLoading || tags.length >= 5 || !tagInput.trim()}
              >
                Hinzufügen
              </Button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {tags.length}/5 Tags verwendet
            </p>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Abbrechen
          </Button>
          <Button type="submit" className="flex-1" disabled={isLoading || categoriesLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wird erstellt...
              </>
            ) : (
              <>
                <MessageSquare className="mr-2 h-4 w-4" />
                Thread erstellen
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Lade...</span>
      </div>
    </div>
  );
}

export default function NewThreadPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<LoadingFallback />}>
        <NewThreadForm />
      </Suspense>
    </DashboardLayout>
  );
}
