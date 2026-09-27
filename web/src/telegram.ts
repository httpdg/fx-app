export function getTelegram() {
  return (window as any).Telegram?.WebApp;
}

export function getInitData(): string | null {
  const tg = getTelegram();
  if (!tg || !tg.initData) return null;
  return tg.initData as string;
}
