import { config } from './config';
import { fetchCandles } from './market';
import { analyzePair } from './model';
import { getEnabledPairs, getLastSignalAt, insertSignal } from './signals';

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
    const pairs = await getEnabledPairs();
    for (const pair of pairs) {
      await maybeGenerateSignal(pair);
    }
  } catch (err) {
    console.error('Ошибка в планировщике сигналов:', err);
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
    await insertSignal(pair, result.direction, config.signalHorizonSeconds, result.reasoning);
    console.log(`Сигнал ${pair}: ${result.direction}`);
  } catch (err) {
    console.error(`Не удалось сгенерировать сигнал для ${pair}:`, err);
  }
}
