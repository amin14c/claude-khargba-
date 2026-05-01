// ═══════════════════════════════════════════════════════
//  gameLogic.ts — منطق لعبة خربڤة (7×7)
//  مستقل تماماً عن React — قابل للاختبار بسهولة
// ═══════════════════════════════════════════════════════

export const BOARD_SIZE = 7;
export const CENTER_IDX = 24;         // الخلية الوسطى (3,3)
export const TOTAL_CELLS = 49;
export const MAX_PIECES   = 48;       // 24 لكل لاعب، الوسطى فارغة دائماً

// ── Types ─────────────────────────────────────────────
export type Piece      = '1' | '2' | '';
export type Board      = Piece[];
export type Role       = 'host' | 'guest';
export type Phase      = 'placement' | 'movement';
export type GameStatus = 'waiting' | 'playing' | 'finished';

export interface MoveResult {
  board:       Board;
  captured:    boolean;
  canContinue: boolean;   // true = يمكن الاستمرار في الأسر (نفس الدور)
}

// ── الحركات الصحيحة ────────────────────────────────────
export function getValidMoves(idx: number, board: Board): number[] {
  const moves: number[] = [];
  const r = Math.floor(idx / BOARD_SIZE);
  const c = idx % BOARD_SIZE;

  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
      const nIdx = nr * BOARD_SIZE + nc;
      if (board[nIdx] === '') moves.push(nIdx);
    }
  }
  return moves;
}

// ── تطبيق الحركة مع الأسر ──────────────────────────────
export function applyMove(
  board:   Board,
  fromIdx: number,
  toIdx:   number,
  piece:   Piece
): MoveResult {
  const opp      = piece === '1' ? '2' : '1';
  const newBoard = [...board] as Board;
  newBoard[toIdx]   = piece;
  newBoard[fromIdx] = '';

  const r = Math.floor(toIdx / BOARD_SIZE);
  const c = toIdx % BOARD_SIZE;
  let captured = false;

  // الأسر في الاتجاهات الأربعة
  const checks: [number, number, boolean][] = [
    [-1,  0, r >= 2],
    [ 1,  0, r <= 4],
    [ 0, -1, c >= 2],
    [ 0,  1, c <= 4],
  ];

  for (const [dr, dc, valid] of checks) {
    if (!valid) continue;
    const mid = (r + dr)   * BOARD_SIZE + (c + dc);
    const far = (r + 2*dr) * BOARD_SIZE + (c + 2*dc);
    if (newBoard[mid] === opp && newBoard[far] === piece) {
      newBoard[mid] = '';
      captured = true;
    }
  }

  const canContinue = captured && _canCaptureMore(newBoard, piece, opp);
  return { board: newBoard, captured, canContinue };
}

// ── هل يوجد أسر إضافي ممكن؟ ───────────────────────────
function _canCaptureMore(board: Board, piece: Piece, opp: Piece): boolean {
  for (let i = 0; i < TOTAL_CELLS; i++) {
    if (board[i] !== piece) continue;
    for (const toIdx of getValidMoves(i, board)) {
      const temp = [...board] as Board;
      temp[toIdx] = piece;
      temp[i]     = '';
      if (_wouldCapture(temp, toIdx, piece, opp)) return true;
    }
  }
  return false;
}

function _wouldCapture(board: Board, idx: number, piece: Piece, opp: Piece): boolean {
  const r = Math.floor(idx / BOARD_SIZE);
  const c = idx % BOARD_SIZE;
  return (
    (r >= 2 && board[(r-1)*BOARD_SIZE + c]   === opp && board[(r-2)*BOARD_SIZE + c]   === piece) ||
    (r <= 4 && board[(r+1)*BOARD_SIZE + c]   === opp && board[(r+2)*BOARD_SIZE + c]   === piece) ||
    (c >= 2 && board[r*BOARD_SIZE + (c-1)]   === opp && board[r*BOARD_SIZE + (c-2)]   === piece) ||
    (c <= 4 && board[r*BOARD_SIZE + (c+1)]   === opp && board[r*BOARD_SIZE + (c+2)]   === piece)
  );
}

// ── فحص الفائز ─────────────────────────────────────────
export function checkWinner(board: Board, mover: Role): Role | null {
  const opp: Piece = mover === 'host' ? '2' : '1';
  return countPieces(board, opp) <= 1 ? mover : null;
}

// ── عدد القطع ──────────────────────────────────────────
export function countPieces(board: Board, piece: Piece): number {
  return board.filter(c => c === piece).length;
}

// ── دور التوضع (كل لاعب يضع قطعتين متتاليتين) ──────────
export function getNextTurnPlacement(numPlacedAfter: number): Role {
  return (Math.floor(numPlacedAfter / 2) % 2) === 0 ? 'host' : 'guest';
}

// ── Bot ────────────────────────────────────────────────
export interface BotMove {
  fromIdx: number | null;
  toIdx:   number;
}

export function getBotMove(board: Board, phase: Phase, botPiece: Piece): BotMove | null {
  if (phase === 'placement') {
    const empty = board
      .map((v, i) => (v === '' && i !== CENTER_IDX ? i : -1))
      .filter(i => i !== -1);
    if (empty.length === 0) return null;
    return { fromIdx: null, toIdx: empty[Math.floor(Math.random() * empty.length)] };
  }

  // طور الحركة — يفضّل الأسر
  const opp = botPiece === '1' ? '2' : '1';
  const myPieces = board.map((v, i) => (v === botPiece ? i : -1)).filter(i => i !== -1);

  const moves: { fromIdx: number; toIdx: number; priority: number }[] = [];

  for (const fromIdx of myPieces) {
    for (const toIdx of getValidMoves(fromIdx, board)) {
      const { captured } = applyMove(board, fromIdx, toIdx, botPiece);
      moves.push({ fromIdx, toIdx, priority: captured ? 1 : 0 });
    }
  }

  if (moves.length === 0) return null;

  moves.sort((a, b) => b.priority - a.priority);
  const best = moves[0].priority;
  const candidates = moves.filter(m => m.priority === best);
  return candidates[Math.floor(Math.random() * candidates.length)];
  }
