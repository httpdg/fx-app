import { config } from './config';

export interface Candle {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

// https://api.twelvedata.com/time_series?symbol=EUR/USD&interval=1min&outputsize=30&apikey=...
export async function fetchCandles(pair: string, count = 30): Promise<Candle[]> {
  const url = new URL('https://api.twelvedata.com/time_series');
  url.searchParams.set('symbol', pair);
  url.searchParams.set('interval', '1min');
  url.searchParams.set('outputsize', String(count));
  url.searchParams.set('apikey', config.twelveDataApiKey ?? '');

  const res = await fetch(url);
  const data = (await res.json()) as any;

  if (data.status === 'error' || !Array.isArray(data.values)) {
    throw new Error(`Twelve Data не отдал свечи для ${pair}: ${data.message ?? 'неизвестная ошибка'}`);
  }

  // Twelve Data отдаёт свечи от новых к старым — разворачиваем в хронологический порядок
  return (data.values as any[])
    .map((v) => ({
      datetime: v.datetime,
      open: Number(v.open),
      high: Number(v.high),
      low: Number(v.low),
      close: Number(v.close)
    }))
    .reverse();
}
