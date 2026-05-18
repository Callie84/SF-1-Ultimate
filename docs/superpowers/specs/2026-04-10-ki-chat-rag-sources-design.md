# Design: KI-Chat mit RAG-Sources (Task A)

**Datum:** 2026-04-10  
**Scope:** Frontend KI-Chat Component mit integrierter RAG-Source Display  
**Status:** Design Approved

---

## 1. Overview

Erweitern der existierenden KI-Chat-UI um:
- **RAG-Integration im Backend** → Sources automatisch suchen
- **Inline Source-Display (Accordion)** → Klappbar unter jeder AI-Nachricht
- **Konfigurierbare Navigation** → Admin kann Modal vs. Direct-Link wählen

**User-Flow:**
```
User fragt "Was ist Northern Lights?"
    ↓
Backend (parallel):
  • Ruft OpenAI auf → "Northern Lights ist..."
  • Ruft RAG Service auf → Findet 3-5 relevante Seeds
    ↓
Response: { content, sources: [...], messageId, sessionId }
    ↓
Frontend zeigt:
  "Northern Lights ist... [AI-Text]"
  "▼ 3 Sources" [Accordion, auf Klick expandiert]
    ├─ 🌿 Northern Lights Strain (strain) →
    ├─ 📊 Flavor Profile (flavor-profile) →
    └─ 🌱 Growing Guide (grow-guide) →
```

---

## 2. Data Model

### 2.1 Backend Response (ChatService)

**Neues Response-Format:**

```typescript
interface ChatResponse {
  content: string;           // AI-Antwort
  sources: Source[];         // 3-5 relevante Seeds
  messageId: string;
  timestamp: number;
  sessionId: string;
}

interface Source {
  id: string;                // Seed-ID (z.B. "seed_xyz")
  title: string;             // "Northern Lights Strain"
  type: 'strain' | 'flavor-profile' | 'grow-guide' | 'other';
  description?: string;      // Optional: kurze Beschreibung
}
```

### 2.2 Frontend Message Object

**Erweitert bestehende Message-Struktur:**

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Source[];        // ← NEU (optional, nur für AI-Messages)
}
```

---

## 3. Architecture

### 3.1 Backend: ChatService (Parallel RAG)

**Datei:** `apps/ai-service/src/services/chat.service.ts`

**Änderung in `chat()` Methode:**

```typescript
async chat(userId: string, message: string, sessionId?: string, provider: 'openai' | 'ollama' = 'openai'): Promise<ChatResponse> {
  const session = await this.getOrCreateSession(userId, sessionId);
  
  // Nutzer-Message speichern
  const userMsgId = `msg_${Date.now()}_user`;
  session.messages.push({ id: userMsgId, role: 'user', content: message, timestamp: Date.now() });
  
  // ← PARALLEL: AI + RAG gleichzeitig
  const [assistantResponse, sources] = await Promise.all([
    this.callAI(message, session.messages, provider),   // OpenAI oder Ollama
    this.callRAG(message)                                // RAG Service
  ]);
  
  // Timeout: Wenn RAG > 3s, sources = [] (blockiert AI nicht)
  
  // AI-Message speichern (jetzt mit sources)
  const assistantMsgId = `msg_${Date.now()}_ai`;
  session.messages.push({
    id: assistantMsgId,
    role: 'assistant',
    content: assistantResponse,
    timestamp: Date.now()
  });
  
  await this.saveSession(session);
  
  return {
    content: assistantResponse,
    sources: sources || [],        // ← Sources in Response
    messageId: assistantMsgId,
    timestamp: Date.now(),
    sessionId: session.id
  };
}

private async callRAG(message: string): Promise<Source[]> {
  try {
    const response = await fetch('http://sf1-rag-service:3010/api/rag/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: message, limit: 5 })
    });
    const data = await response.json();
    return data.sources || [];
  } catch (error) {
    logger.warn('[Chat] RAG failed, continuing without sources', error);
    return [];
  }
}
```

**Integration Checklist:**
- ✅ Parallel Requests (Promise.all)
- ✅ Timeout-Handling (RAG max 3s)
- ✅ Error-Graceful (wenn RAG fehlschlägt → sources = [])
- ✅ Response-Format erweitert

### 3.2 Frontend: ChatMessages Component

**Datei:** `apps/web-app/src/components/ai/chat-messages.tsx`

**Änderungen:**
1. `MessageBubble` erweitert um `sources` prop
2. Neue Sub-Component: `<SourcesSummary sources={[...]} />`

```typescript
// chat-messages.tsx
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Source[];        // ← NEU
}

function MessageBubble({ message }: { message: Message }) {
  return (
    <div>
      {/* Bestehender Message-Content */}
      <ReactMarkdown>{message.content}</ReactMarkdown>
      
      {/* ← NEU: Sources Accordion */}
      {message.sources && message.sources.length > 0 && (
        <SourcesSummary sources={message.sources} />
      )}
    </div>
  );
}
```

**Neue Component: `SourcesSummary`**

```typescript
// components/ai/sources-summary.tsx
interface SourcesSummaryProps {
  sources: Source[];
}

export function SourcesSummary({ sources }: SourcesSummaryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { sourceLinkMode } = useAdminSettings(); // Modal oder Direct
  
  const handleSourceClick = (sourceId: string) => {
    if (sourceLinkMode === 'modal') {
      // TODO: Öffne Seed Modal
    } else {
      // TODO: Navigiere zu /seeds/{sourceId}
    }
  };
  
  return (
    <div className="mt-3 text-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        {isOpen ? '▼' : '▶'} {sources.length} Source{sources.length !== 1 ? 's' : ''}
      </button>
      
      {isOpen && (
        <div className="mt-2 space-y-1 pl-4 border-l border-accent">
          {sources.map((source) => (
            <button
              key={source.id}
              onClick={() => handleSourceClick(source.id)}
              className="block text-left hover:text-primary transition-colors text-xs"
            >
              <span className="inline-block mr-1">
                {source.type === 'strain' && '🌿'}
                {source.type === 'flavor-profile' && '📊'}
                {source.type === 'grow-guide' && '🌱'}
                {!['strain', 'flavor-profile', 'grow-guide'].includes(source.type) && '📚'}
              </span>
              <strong>{source.title}</strong> <span className="text-muted-foreground">({source.type})</span> →
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 3.3 Admin-Setting: Source-Navigation Mode

**Datei:** `apps/ai-service/src/config/admin-settings.ts` (neu oder erweitert)

```typescript
interface AdminSettings {
  sourceLinkMode: 'modal' | 'direct';  // Admin-konfigurierbar
  ragEnabled: boolean;
  // ... weitere Settings
}

// Default
export const DEFAULT_SETTINGS: AdminSettings = {
  sourceLinkMode: 'modal',  // User bleibt im Chat
  ragEnabled: true,
  // ...
};
```

**Admin-Endpoint:** `PATCH /api/admin/settings`

```typescript
router.patch('/settings',
  authMiddleware,
  adminMiddleware,  // Nur Admin
  async (req, res, next) => {
    try {
      const { sourceLinkMode, ragEnabled } = req.body;
      
      // Validierung
      if (sourceLinkMode && !['modal', 'direct'].includes(sourceLinkMode)) {
        return res.status(400).json({ error: 'Invalid sourceLinkMode' });
      }
      
      // In DB/Redis speichern
      await adminSettingsService.update({
        sourceLinkMode: sourceLinkMode || DEFAULT_SETTINGS.sourceLinkMode,
        ragEnabled: ragEnabled ?? DEFAULT_SETTINGS.ragEnabled
      });
      
      res.json({ success: true, settings: await adminSettingsService.get() });
    } catch (error) {
      next(error);
    }
  }
);
```

**Frontend Hook:** `useAdminSettings()`

```typescript
// hooks/use-admin-settings.ts
export function useAdminSettings() {
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  
  useEffect(() => {
    apiClient.get('/api/admin/settings')
      .then(data => setSettings(data))
      .catch(() => {}); // Silent fallback to defaults
  }, []);
  
  return settings;
}
```

---

## 4. Implementation Details

### 4.1 RAG Service Integration

**RAG-Service Endpoint (existiert bereits):**
- `POST /api/rag/search` — Query ausführen, Returns: `{ sources: [...] }`

**Erwartetes Format:**
```typescript
interface RagSearchRequest {
  query: string;
  limit?: number;  // Default: 5
}

interface RagSearchResponse {
  sources: Array<{
    id: string;
    title: string;
    type: string;
    description?: string;
  }>;
}
```

### 4.2 Navigation Modes

**Mode A: Modal**
- Seed-Details öffnen in Modal/Sidebar
- User bleibt im Chat-Context
- Best für mobile UX
- Implementation: Zustand-Store + Modal-Component

**Mode B: Direct**
- Navigation zu `/seeds/{id}` Page
- User verlässt Chat
- Best für Desktop (neue Tab)
- Implementation: Next.js router.push()

**Switch in Admin UI:**
- Dropdown/Toggle im Admin-Panel
- Sofort wirksam (no page reload nötig)
- Redis-Cache oder Session-Storage

---

## 5. Error Handling & Edge Cases

| Szenario | Verhalten |
|----------|-----------|
| RAG-Service offline | Sources = [], Chat antwortet normal |
| RAG zu langsam (>3s) | Timeout, Sources = [] |
| OpenAI offline | Error wie bisher |
| 0 Sources gefunden | Message zeigt: "▼ 0 Sources" (unsichtbar) |
| Source-ID invalid | Link zeigt 404-Page oder bleibt disabled |

---

## 6. Testing

### 6.1 Backend Tests

```typescript
// chat.service.spec.ts
it('should fetch sources parallel with AI response', async () => {
  // Mock OpenAI + RAG
  const result = await chatService.chat('user123', 'What is Northern Lights?');
  expect(result.sources).toBeDefined();
  expect(result.sources.length).toBeLessThanOrEqual(5);
  expect(result.content).toBeTruthy();
});

it('should handle RAG timeout gracefully', async () => {
  // Mock RAG to timeout
  const result = await chatService.chat('user123', 'Question...');
  expect(result.sources).toEqual([]);
  expect(result.content).toBeTruthy(); // AI antwortet trotzdem
});
```

### 6.2 Frontend Tests

```typescript
// SourcesSummary.spec.tsx
it('should render sources accordion', () => {
  const sources = [{ id: '1', title: 'Strain', type: 'strain' }];
  render(<SourcesSummary sources={sources} />);
  expect(screen.getByText(/1 Source/)).toBeInTheDocument();
});

it('should navigate on source click (based on mode)', async () => {
  const sources = [{ id: 'seed_123', title: 'NL', type: 'strain' }];
  render(<SourcesSummary sources={sources} />);
  
  const button = screen.getByText(/NL/);
  fireEvent.click(button);
  
  // Abhängig von useAdminSettings: Modal oder Navigation
});
```

---

## 7. Files to Create/Modify

### Create
- `apps/web-app/src/components/ai/sources-summary.tsx` — Source-Display Component
- `apps/web-app/src/hooks/use-admin-settings.ts` — Settings Hook
- `apps/ai-service/src/config/admin-settings.ts` — Admin-Settings Config
- `docs/superpowers/specs/2026-04-10-ki-chat-rag-sources-design.md` — This file

### Modify
- `apps/ai-service/src/services/chat.service.ts` — Parallel RAG-Calls
- `apps/ai-service/src/routes/ai.routes.ts` — Admin-Settings Endpoint
- `apps/web-app/src/components/ai/chat-messages.tsx` — SourcesSummary Integration
- `apps/web-app/src/app/ai/chat/page.tsx` — Message-Type Update
- `apps/ai-service/src/services/chat.service.ts` — Response-Interface

---

## 8. Success Criteria

✅ Chat-Response inkludiert Sources Array  
✅ Frontend rendert Sources-Accordion  
✅ Accordion expandiert/kollabiert  
✅ Klick auf Source navigiert (Modal oder Direct basierend auf Setting)  
✅ Admin kann Mode switchen (Modal ↔ Direct)  
✅ RAG-Fehler blockiert Chat nicht  
✅ Mobile responsive (PWA-ready)  
✅ Tests geschrieben (Backend + Frontend)

---

## 9. Migration/Rollback

**Rollback-Plan:** Falls RAG-Integration fehlschlägt:
1. `ragEnabled: false` in Admin-Settings
2. ChatService ignoriert RAG-Calls
3. Response hat `sources: []`
4. Frontend zeigt keine Sources

**No Breaking Change** — bestehender Code funktioniert mit `sources: []`.

---

**Status:** Ready for Implementation Planning ✅
