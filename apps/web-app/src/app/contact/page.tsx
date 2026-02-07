'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Mail, Send, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ContactPage() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Bitte fülle alle Pflichtfelder aus');
      return;
    }
    setSending(true);
    // Simulate sending
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSending(false);
    setSent(true);
    toast.success('Nachricht gesendet! Wir melden uns bald bei dir.');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/landing">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>

        <h1 className="mb-8 text-4xl font-bold">Kontakt</h1>

        {sent ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12">
              <CheckCircle className="mb-4 h-16 w-16 text-green-500" />
              <h3 className="mb-2 text-xl font-semibold">Nachricht gesendet!</h3>
              <p className="text-muted-foreground mb-6 text-center">
                Vielen Dank für deine Nachricht. Wir werden uns so schnell wie möglich bei dir melden.
              </p>
              <Button asChild>
                <Link href="/landing">Zur Startseite</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Schreib uns
              </CardTitle>
              <CardDescription>
                Hast du Fragen, Feedback oder ein Anliegen? Wir helfen dir gerne weiter.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Dein Name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">E-Mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="deine@email.de"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="subject">Betreff</Label>
                  <Input
                    id="subject"
                    value={form.subject}
                    onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="Worum geht es?"
                  />
                </div>
                <div>
                  <Label htmlFor="message">Nachricht *</Label>
                  <textarea
                    id="message"
                    value={form.message}
                    onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Deine Nachricht..."
                    rows={6}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <Button type="submit" disabled={sending} className="w-full">
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird gesendet...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Nachricht senden
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
