'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Sprout, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api-client';

const schema = z.object({
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwörter stimmen nicht überein',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/10 to-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <CardTitle>Ungültiger Link</CardTitle>
            <CardDescription>
              Dieser Reset-Link ist ungültig oder abgelaufen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/auth/forgot-password">Neuen Reset-Link anfordern</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, password: data.password });
      setSuccess(true);
      toast.success('Passwort erfolgreich geändert!');
      setTimeout(() => router.push('/auth/login'), 2000);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Ungültiger oder abgelaufener Token');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/10 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              {success ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <Sprout className="h-8 w-8 text-primary" />
              )}
            </div>
          </div>
          <CardTitle className="text-2xl">
            {success ? 'Passwort geändert!' : 'Neues Passwort setzen'}
          </CardTitle>
          <CardDescription>
            {success
              ? 'Du wirst in Kürze zum Login weitergeleitet.'
              : 'Gib dein neues Passwort ein.'}
          </CardDescription>
        </CardHeader>

        {!success && (
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Neues Passwort</label>
                <Input
                  type="password"
                  placeholder="Mindestens 8 Zeichen"
                  {...register('password')}
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Passwort bestätigen</label>
                <Input
                  type="password"
                  placeholder="Passwort wiederholen"
                  {...register('confirmPassword')}
                  disabled={isLoading}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird gespeichert...
                  </>
                ) : (
                  'Passwort speichern'
                )}
              </Button>
            </form>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
