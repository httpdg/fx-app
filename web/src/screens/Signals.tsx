import { useEffect, useState } from 'react';
import { Card } from '../components/Card';

interface SignalItem {
  id: number;
  pair: string;
  direction: 'up' | 'down';
  reasoning: string | null;
  created_at: string;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'только что';
  if (minutes === 1) return '1 минуту назад';
  if (minutes < 5) return `${minutes} минуты назад`;
  return `${minutes} минут назад`;
}

export function Signals() {
  const [signals, setSignals] = useState<SignalItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/signals', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setSignals(data.signals);
      } catch {
        // тихо пропускаем — при следующем опросе попробуем снова
      }
    }

    load();
    const interval = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (signals === null) {
    return <div className="screen" />;
  }

  if (signals.length === 0) {
    return (
      <div className="screen">
        <Card>
          <p className="empty-state">Пока нет сигналов. Первый появится в течение пяти минут.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {signals.map((s) => (
        <Card key={s.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontWeight: 600 }}>{s.pair}</span>
            <span style={{ fontWeight: 600 }}>{s.direction === 'up' ? 'Вверх' : 'Вниз'}</span>
          </div>
          {s.reasoning && (
            <p className="empty-state" style={{ marginTop: 'var(--space-2)' }}>
              {s.reasoning}
            </p>
          )}
          <p className="empty-state" style={{ marginTop: 'var(--space-2)', fontSize: 12 }}>
            {relativeTime(s.created_at)}
          </p>
        </Card>
      ))}
    </div>
  );
}
