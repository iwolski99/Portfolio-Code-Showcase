import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chess } from 'chess.js';

const CHECK_GLOW_RGB = '255, 60, 60';

function hslToHex(h, s, l) {
  const hh = ((h % 360) + 360) % 360;
  const ss = Math.max(0, Math.min(100, s)) / 100;
  const ll = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hh < 60) {
    r1 = c;
    g1 = x;
  } else if (hh < 120) {
    r1 = x;
    g1 = c;
  } else if (hh < 180) {
    g1 = c;
    b1 = x;
  } else if (hh < 240) {
    g1 = x;
    b1 = c;
  } else if (hh < 300) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }

  const to255 = (value) => Math.max(0, Math.min(255, Math.round((value + m) * 255)));
  const r = to255(r1);
  const g = to255(g1);
  const b = to255(b1);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function isInCheck(game) {
  if (!game) return false;
  try {
    if (typeof game.inCheck === 'function') return !!game.inCheck();
  } catch {}
  try {
    if (typeof game.in_check === 'function') return !!game.in_check();
  } catch {}
  return false;
}

function findKingSquare(game) {
  const board = game.board();
  const color = game.turn();
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const piece = board?.[y]?.[x];
      if (piece?.type === 'k' && piece?.color === color) {
        return `${String.fromCharCode(97 + x)}${8 - y}`;
      }
    }
  }
  return null;
}

export const PuzzleBoardCheckOverlay = memo(function PuzzleBoardCheckOverlay({ fen, userColor, boardSize, boardHue, boardLightBoost, boardDarkBoost }) {
  const boardColors = useMemo(
    () => ({
      white: hslToHex(boardHue ?? 120, 35, 78 + (92 - 78) * Math.max(0, Math.min(1, Number(boardLightBoost ?? 0)))),
      black: hslToHex(boardHue ?? 120, 45, 42 - (42 - 20) * Math.max(0, Math.min(1, Number(boardDarkBoost ?? 0)))),
    }),
    [boardDarkBoost, boardHue, boardLightBoost]
  );

  const checkRing = useMemo(() => {
    if (!fen) return null;
    let game;
    try {
      game = new Chess(fen);
    } catch {
      return null;
    }
    if (!isInCheck(game)) return null;

    const square = findKingSquare(game);
    if (!square) return null;

    const file = square.charCodeAt(0) - 97;
    const rank = Number(square[1]) - 1;
    const cell = boardSize / 8;
    const flipped = String(userColor).toLowerCase().startsWith('b');

    return {
      x: (flipped ? 7 - file : file) * cell,
      y: (flipped ? rank : 7 - rank) * cell,
      cell,
    };
  }, [boardSize, fen, userColor]);

  return (
    <View style={[styles.boardWrap, { backgroundColor: boardColors.black }]}>
      {checkRing ? (
        <View pointerEvents="none" style={[styles.checkRingCell, { left: checkRing.x, top: checkRing.y, width: checkRing.cell, height: checkRing.cell }]}>
          <View
            style={{
              width: checkRing.cell * 0.5,
              height: checkRing.cell * 0.5,
              borderRadius: checkRing.cell * 0.25,
              backgroundColor: 'transparent',
              boxShadow:
                `0px 0px ${checkRing.cell * 0.2}px ${checkRing.cell * 0.05}px rgba(${CHECK_GLOW_RGB}, 0.8), ` +
                `0px 0px ${checkRing.cell * 0.4}px ${checkRing.cell * 0.14}px rgba(${CHECK_GLOW_RGB}, 0.45), ` +
                `0px 0px ${checkRing.cell * 0.66}px ${checkRing.cell * 0.26}px rgba(${CHECK_GLOW_RGB}, 0.2)`,
            }}
          />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  boardWrap: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  checkRingCell: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
