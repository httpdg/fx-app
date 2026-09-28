import { config } from './config';
import { Candle } from './market';

export interface SignalResult {
  direction: 'up' | 'down';
  reasoning: string;
}

export async function analyzePair(pair: string, candles: Candle[]): Promise<SignalResult> {
  const prompt = [
    `Пара: ${pair}.`,
    `Последние ${candles.length} минутных свечей, от старой к новой, JSON с open/high/low/close:`,
    JSON.stringify(candles),
    '',
    'Определи вероятное направление движения цены на следующие 5 минут.',
    'Ответь СТРОГО в формате JSON без пояснений вокруг:',
    '{"direction": "up" или "down", "reasoning": "краткое обоснование одним предложением на русском"}'
  ].join('\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.anthropicApiKey ?? '',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = (await res.json()) as any;

  if (data.type === 'error') {
    throw new Error(`Anthropic API вернул ошибку: ${data.error?.message ?? 'неизвестная'}`);
  }

  const text = (data.content ?? [])
    .map((block: any) => (block.type === 'text' ? block.text : ''))
    .join('');

  const cleaned = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned);

  if (parsed.direction !== 'up' && parsed.direction !== 'down') {
    throw new Error(`Модель вернула непонятное направление: ${text}`);
  }

  return { direction: parsed.direction, reasoning: String(parsed.reasoning ?? '') };
}
