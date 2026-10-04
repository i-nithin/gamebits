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

export function buildDesktopFrames(cards: AdSeat[]) {
  const items = cards
    .filter((card) => card.weight > 0)
    .map((card) => ({ id: card.id, weight: card.weight }))
    .sort((a, b) => a.id.localeCompare(b.id));
  if (items.length === 0) return [];
  if (items.length <= 3) return [items.map((card) => card.id)];

  const divisor = gcdAll([...items.map((card) => card.weight), 3]);
  const reduced = items.map((card) => ({
    id: card.id,
    weight: card.weight / divisor,
  }));
  const total = reduced.reduce((sum, card) => sum + card.weight, 0);
  const demand = new Map(reduced.map((card) => [card.id, card.weight * 3]));
  const lastShown = new Map(reduced.map((card) => [card.id, -1]));
  const maxCopies = new Map(
    reduced.map((card) => {
      const share = (card.weight * 3) / total;
      return [card.id, Math.min(3, Math.max(1, Math.ceil(share - 1e-9)))] as const;
    }),
  );

  const frames: string[][] = [];
  for (let frameIndex = 0; frameIndex < total; frameIndex += 1) {
    const framesLeft = total - frameIndex;
    const frame: string[] = [];
    const used = new Map<string, number>();

    function take(id: string) {
      frame.push(id);
      used.set(id, (used.get(id) ?? 0) + 1);
      demand.set(id, (demand.get(id) ?? 0) - 1);
    }

    const required = reduced
      .map((card) => {
        const cap = maxCopies.get(card.id) ?? 1;
        const need = demand.get(card.id) ?? 0;
        const copies = Math.min(cap, Math.max(0, need - (framesLeft - 1) * cap));
        return { id: card.id, copies };
      })
      .filter((card) => card.copies > 0)
      .sort((a, b) => b.copies - a.copies || a.id.localeCompare(b.id));

    for (const card of required) {
      for (let copy = 0; copy < card.copies && frame.length < 3; copy += 1) take(card.id);
    }

    while (frame.length < 3) {
      const candidates = reduced
        .filter((card) => (demand.get(card.id) ?? 0) > 0)
        .sort((a, b) => {
          const demandDelta = (demand.get(b.id) ?? 0) - (demand.get(a.id) ?? 0);
          if (demandDelta !== 0) return demandDelta;
          const shownDelta = (lastShown.get(a.id) ?? -1) - (lastShown.get(b.id) ?? -1);
          if (shownDelta !== 0) return shownDelta;
          return a.id.localeCompare(b.id);
        });
      const pick =
        candidates.find((card) => (used.get(card.id) ?? 0) < 1) ??
        candidates.find((card) => (used.get(card.id) ?? 0) < (maxCopies.get(card.id) ?? 1));
      if (!pick) break;
      take(pick.id);
    }

    if (frame.length === 0) break;
    for (const id of new Set(frame)) lastShown.set(id, frameIndex);
    frames.push([...frame].sort((a, b) => a.localeCompare(b)));
  }
  return frames;
}

export function buildMobileStays(cards: AdSeat[]) {
  return cards
    .filter((card) => card.weight > 0)
    .map((card) => ({ id: card.id, ticks: card.weight }))
    .sort((a, b) => b.ticks - a.ticks || a.id.localeCompare(b.id));
}
