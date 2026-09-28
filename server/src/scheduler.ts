import { config } from './config';
import { fetchCandles, fetchPrice } from './market';
import { analyzePair } from './model';
import { getDueSignals, getEnabledPairs, getLastSignalAt, insertSignal, resolveSignal } from './signals';

const CHECK_INTERVAL_MS = 30_000;

export function startScheduler() {
  if (!config.twelveDataApiKey || !config.anthropicApiKey) {
    console.log('Планировщик сигналов выключен: нет TWELVE_DATA_API_KEY или ANTHROPIC_API_KEY.');
    return;
  }

  tick();
  setInterval(tick, CHECK_INTERVAL_MS);
}

async function tick() {
  try {
    await resolveDueSignals();
  } catch (err) {
    console.error('Ошибка при подведении итогов сигналов:', err);
  }

  try {
    const pairs = await getEnabledPairs();
    for (const pair of pairs) {
      await maybeGenerateSignal(pair);
    }
  } catch (err) {
    console.error('Ошибка в планировщике сигналов:', err);
  }
}

async function resolveDueSignals() {
  const due = await getDueSignals();
  for (const signal of due) {
    try {
      const exitPrice = await fetchPrice(signal.pair);
      const entryPrice = Number(signal.entry_price);
      const hit = signal.direction === 'up' ? exitPrice > entryPrice : exitPrice < entryPrice;
      await resolveSignal(signal.id, exitPrice, hit ? 'hit' : 'miss');
      console.log(`Итог ${signal.pair} #${signal.id}: ${hit ? 'сбылся' : 'не сбылся'}`);
    } catch (err) {
      console.error(`Не удалось подвести итог сигнала #${signal.id}:`, err);
    }
  }
}

async function maybeGenerateSignal(pair: string) {
  const lastAt = await getLastSignalAt(pair);
  const ageMs = lastAt ? Date.now() - lastAt.getTime() : Infinity;
  if (ageMs < config.signalHorizonSeconds * 1000) {
    return;
  }

  try {
    const candles = await fetchCandles(pair);
    const result = await analyzePair(pair, candles);
    const entryPrice = candles[candles.length - 1].close;
    await insertSignal({
      pair,
      direction: result.direction,
      horizonSeconds: config.signalHorizonSeconds,
      reasoning: result.reasoning,
      entryPrice
    });
    console.log(`Сигнал ${pair}: ${result.direction} по цене ${entryPrice}`);
  } catch (err) {
    console.error(`Не удалось сгенерировать сигнал для ${pair}:`, err);
  }
}
