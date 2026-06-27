import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'woodpecker_cycle_results_v1';
let writeChain = Promise.resolve();

function enqueueWrite(op) {
  writeChain = writeChain.then(op, op);
  return writeChain;
}

function safeParse(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeCycle(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const cycleNumber = Number(raw.cycleNumber ?? 0);
  const elapsedMs = Number(raw.elapsedMs ?? 0);
  const attempted = Number(raw.attempted ?? 0);
  const correct = Number(raw.correct ?? 0);
  const incorrect = Number(raw.incorrect ?? Math.max(0, attempted - correct));
  const accuracyPct = Number(raw.accuracyPct ?? 0);
  if (!Number.isFinite(cycleNumber) || cycleNumber <= 0) return null;
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return null;

  return {
    cycleNumber,
    elapsedMs,
    attempted: Math.max(0, attempted),
    correct: Math.max(0, correct),
    incorrect: Math.max(0, incorrect),
    accuracyPct: Math.max(0, Math.min(100, accuracyPct)),
    completedAt: String(raw.completedAt ?? ''),
  };
}

export async function loadResultsForSet(setId) {
  const id = String(setId ?? '').trim();
  if (!id) return { cycles: [], best: null };

  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const state = safeParse(raw) || { bySetId: {} };
  const slot = state.bySetId?.[id];
  const cycles = (Array.isArray(slot?.cycles) ? slot.cycles : []).map(normalizeCycle).filter(Boolean);
  const best = normalizeCycle({ ...slot?.best, cycleNumber: 1 });
  return { cycles, best };
}

export async function appendCycleResult(setId, result) {
  const id = String(setId ?? '').trim();
  if (!id) return null;

  const normalized = normalizeCycle({
    ...result,
    completedAt: new Date().toISOString(),
  });
  if (!normalized) return null;

  return enqueueWrite(async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const state = safeParse(raw) || { bySetId: {} };
    const prevSlot = state.bySetId?.[id];
    const prevCycles = (Array.isArray(prevSlot?.cycles) ? prevSlot.cycles : []).map(normalizeCycle).filter(Boolean);
    const cycles = [...prevCycles, normalized];

    const prevBest = prevSlot?.best || null;
    const nextBest = {
      elapsedMs: normalized.elapsedMs,
      accuracyPct: normalized.accuracyPct,
      attempted: normalized.attempted,
      correct: normalized.correct,
      incorrect: normalized.incorrect,
      completedAt: normalized.completedAt,
    };

    let best = nextBest;
    if (prevBest && typeof prevBest.elapsedMs === 'number') {
      const prevAcc = Number(prevBest.accuracyPct ?? 0);
      const nextAcc = Number(nextBest.accuracyPct ?? 0);
      const prevElapsed = Number(prevBest.elapsedMs);
      const nextElapsed = Number(nextBest.elapsedMs);
      const isBetter = nextAcc > prevAcc || (nextAcc === prevAcc && nextElapsed < prevElapsed);
      best = isBetter ? nextBest : prevBest;
    }

    const nextState = {
      ...state,
      bySetId: {
        ...(state.bySetId || {}),
        [id]: { cycles, best },
      },
    };

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    return { cycles, best };
  });
}
