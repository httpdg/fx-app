import { useEffect, useState } from 'react';
import { getInitData, getTelegram } from './telegram';
import { NotInTelegram } from './NotInTelegram';
import { BottomNav } from './components/BottomNav';
import { Home } from './screens/Home';
import { Signals } from './screens/Signals';
import { Settings } from './screens/Settings';
import './styles/components.css';

type Status = 'checking' | 'no-telegram' | 'authed' | 'error';

const TABS = [
  { id: 'home', label: 'Главная' },
  { id: 'signals', label: 'Сигналы' },
  { id: 'settings', label: 'Настройки' }
];

export default function App() {
  const [status, setStatus] = useState<Status>('checking');
  const [tab, setTab] = useState('home');

  useEffect(() => {
    const initData = getInitData();

    if (!initData) {
      setStatus('no-telegram');
      return;
    }

    const tg = getTelegram();
    tg?.ready?.();
    tg?.expand?.();

    fetch('/api/auth/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ initData })
    })
      .then((res) => {
        if (!res.ok) throw new Error('auth failed');
        setStatus('authed');
      })
      .catch(() => setStatus('error'));
  }, []);

  // Вход невидимый: пока идёт проверка, юзер просто видит пустой фон
  // страницы — без спиннеров и текста, чтобы не мигало.
  if (status === 'checking') {
    return <div style={{ minHeight: '100%', background: 'var(--color-bg)' }} />;
  }

  if (status === 'no-telegram' || status === 'error') {
    return <NotInTelegram />;
  }

  return (
    <div className="app-shell">
      {tab === 'home' && <Home />}
      {tab === 'signals' && <Signals />}
      {tab === 'settings' && <Settings />}
      <BottomNav tabs={TABS} active={tab} onChange={setTab} />
    </div>
  );
}
