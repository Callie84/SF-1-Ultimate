'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot } from 'lucide-react';

export default function AdminAiPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">AI-Monitoring</h1>
          <p className="text-muted-foreground">OpenAI Token-Verbrauch und Kosten</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI-Service deaktiviert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Der AI-Service wurde vorübergehend deaktiviert.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
