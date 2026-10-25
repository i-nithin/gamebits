export type AdSeat = {
  id: string;
  weight: number;
};

function gcd(a: number, b: number) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x;
}

function gcdAll(values: number[]) {
  return values.reduce((current, value) => gcd(current, value), 0);
}

export function buildAdRotation(cards: AdSeat[]) {
  const items = cards
    .filter((card) => card.weight > 0)
    .map((card) => ({ id: card.id, weight: card.weight }))
    .sort((a, b) => a.id.localeCompare(b.id));
  if (items.length === 0) return [];

  const divisor = gcdAll(items.map((card) => card.weight));
  const remaining = items.map((card) => ({
    id: card.id,
    left: card.weight / divisor,
  }));
  const total = remaining.reduce((sum, card) => sum + card.left, 0);
  const rotation: string[] = [];
  let lastId = "";

  for (let step = 0; step < total; step += 1) {
    const available = remaining.filter((card) => card.left > 0);
    const preferred = available.filter((card) => card.id !== lastId);
    const pool = (preferred.length > 0 ? preferred : available).toSorted(
      (a, b) => b.left - a.left || a.id.localeCompare(b.id),
    );
    const pick = pool[0];
    if (!pick) break;
    pick.left -= 1;
    rotation.push(pick.id);
    lastId = pick.id;
  }

  return rotation;
}
