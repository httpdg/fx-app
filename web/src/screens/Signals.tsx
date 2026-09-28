import { useEffect, useState } from 'react';
import { Card } from '../components/Card';

interface SignalItem {
  id: number;
  pair: string;
  direction: 'up' | 'down';
  reasoning: string | null;
  result: 'hit' | 'miss' | null;
  created_at: string;
}

interface Stats {
  hits: number;
  total: number;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'только что';
  if (minutes === 1) return '1 минуту назад';
  if (minutes < 5) return `${minutes} минуты назад`;
  return `${minutes} минут назад`;
}

function statusLabel(result: 'hit' | 'miss' | null): string {
  if (result === 'hit') return 'Сбылся';
  if (result === 'miss') return 'Не сбылся';
  return 'Ждём итога';
}

export function Signals() {
  const [signals, setSignals] = useState<SignalItem[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/signals', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setSignals(data.signals);
          setStats(data.stats);
        }
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

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {stats && stats.total > 0 && (
        <p className="empty-state">
          {stats.hits} из {stats.total} сбылось за последние завершённые сигналы
        </p>
      )}

      {signals.length === 0 && (
        <Card>
          <p className="empty-state">Пока нет сигналов. Первый появится в течение пяти минут.</p>
        </Card>
      )}

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
          <div
            style={{
              marginTop: 'var(--space-2)',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12
            }}
          >
            <span className="empty-state">{relativeTime(s.created_at)}</span>
            <span className="empty-state">{statusLabel(s.result)}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
