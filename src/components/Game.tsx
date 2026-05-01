import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { db, auth } from '../firebase/config';
import {
  doc, onSnapshot, updateDoc, runTransaction,
  collection, query, where, getDoc, setDoc,
  serverTimestamp, orderBy,
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import {
  Board, Phase, Role, Piece,
  applyMove, getValidMoves, checkWinner,
  getNextTurnPlacement, getBotMove, countPieces,
  CENTER_IDX, MAX_PIECES,
} from '../lib/gameLogic';
import { cn } from '../lib/utils';
import { playSound } from '../lib/sounds';
import type { GameDoc, ChatMessage, GameBoardProps } from '../types';
import { Send } from 'lucide-react';

// ── Helpers ────────────────────────────────────────────
function newGameId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

function emptyBoard(): Board {
  return Array(49).fill('') as Board;
}

// ══════════════════════════════════════════════════════
//  GameLobby
// ══════════════════════════════════════════════════════
export default function GameLobby() {
  const { t } = useTranslation();
  const [games, setGames]             = useState<GameDoc[]>([]);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;

    // ألعاب المستخدم النشطة
    const myGames = (field: 'hostId' | 'guestId') =>
      query(
        collection(db, 'games'),
        where(field, '==', uid),
        where('status', 'in', ['waiting', 'playing'])
      );

    const handleMyGame = (snapshot: any) => {
      snapshot.docs.forEach((d: any) => setActiveGameId(d.id));
    };

    const unsub1 = onSnapshot(myGames('hostId'),  handleMyGame,
      e => handleFirestoreError(e, OperationType.LIST, 'games'));
    const unsub2 = onSnapshot(myGames('guestId'), handleMyGame,
      e => handleFirestoreError(e, OperationType.LIST, 'games'));

    // قائمة الجلسات المتاحة
    const qWait = query(collection(db, 'games'), where('status', '==', 'waiting'));
    const unsubWait = onSnapshot(qWait, snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }) as GameDoc)
        .filter(g => g.hostId !== uid);
      setGames(list);
    }, e => handleFirestoreError(e, OperationType.LIST, 'games'));

    return () => { unsub1(); unsub2(); unsubWait(); };
  }, [uid]);

  const createGame = async (guestId: string, status: 'waiting' | 'playing') => {
    if (!uid) return;
    const gameId  = newGameId();
    const gameRef = doc(db, 'games', gameId);
    try {
      await setDoc(gameRef, {
        status,
        hostId:    uid,
        guestId,
        turn:      'host' as Role,
        board:     emptyBoard(),
        winner:    '',
        phase:     'placement' as Phase,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setActiveGameId(gameId);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `games/${gameId}`);
    }
  };

  const joinGame = async (gameId: string) => {
    if (!uid) return;
    try {
      await updateDoc(doc(db, 'games', gameId), {
        status:    'playing',
        guestId:   uid,
        updatedAt: serverTimestamp(),
      });
      setActiveGameId(gameId);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `games/${gameId}`);
    }
  };

  if (activeGameId) {
    return <GameBoard gameId={activeGameId} onExit={() => setActiveGameId(null)} />;
  }

  return (
    <div className="w-full flex-1 flex flex-col gap-6 max-w-md mx-auto mt-4 font-serif">
      {/* إنشاء مباراة */}
      <div className="luxury-panel p-8 text-center space-y-4">
        <h3 className="text-xl font-display font-bold uppercase tracking-widest luxury-text-gold">
          {t('create_game')}
        </h3>
        <p className="text-[10px] uppercase font-sans tracking-widest text-[#E6D5B8] opacity-60">
          اختر نوع المباراة
        </p>
        <div className="flex gap-3 mt-2">
          {[
            { label: t('create_game'),  action: () => createGame('',      'waiting') },
            { label: 'vs AI',           action: () => createGame('bot',   'playing') },
            { label: 'Pass & Play',     action: () => createGame('local', 'playing') },
          ].map(({ label, action }) => (
            <button
              key={label}
              onClick={action}
              className="flex-1 luxury-btn-primary py-4 rounded-[4px] text-xs font-display"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* قائمة الجلسات */}
      <div className="luxury-panel p-6 flex flex-col">
        <h3 className="text-sm font-display font-bold uppercase tracking-[0.2em] mb-4 pb-3 border-b border-[rgba(212,175,55,0.15)] luxury-text-gold">
          {t('available_games')}
        </h3>
        {games.length === 0 ? (
          <p className="text-[#E6D5B8] opacity-40 text-xs italic text-center py-4">
            {t('no_games')}
          </p>
        ) : (
          <div className="space-y-3">
            {games.map(game => (
              <div
                key={game.id}
                className="flex justify-between items-center p-4 bg-[#12100E]/50 rounded-[4px] border border-[rgba(212,175,55,0.2)] hover:border-[#D4AF37] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#D4AF37] shadow-[0_0_8px_#D4AF37]" />
                  <span className="text-xs font-bold text-[#E6D5B8] uppercase tracking-widest font-display">
                    Session {game.id.slice(0, 6)}
                  </span>
                </div>
                <button
                  onClick={() => joinGame(game.id)}
                  className="luxury-btn px-4 py-2 rounded-[2px] text-[10px]"
                >
                  {t('join_game')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Network Status */}
      <div className="flex justify-center items-center gap-3 bg-[#12100E] border border-[rgba(212,175,55,0.15)] rounded-lg py-4 text-center">
        <span className="block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[9px] uppercase font-bold text-[#D4AF37] opacity-60 font-display tracking-[0.2em]">
          Synchronized
        </span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  GameBoard
// ══════════════════════════════════════════════════════
function GameBoard({ gameId, onExit }: GameBoardProps) {
  const { t }   = useTranslation();
  const uid     = auth.currentUser?.uid;

  const [game, setGame]           = useState<GameDoc | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [chatText, setChatText]   = useState('');
  const [hostName, setHostName]   = useState('Player 1');
  const [guestName, setGuestName] = useState('Player 2');
  const chatRef                   = useRef<HTMLDivElement>(null);
  const prevGameRef               = useRef<GameDoc | null>(null);

  // ── Subscriptions ──────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'games', gameId),
      snap => snap.exists() ? setGame({ id: snap.id, ...snap.data() } as GameDoc) : onExit(),
      e => handleFirestoreError(e, OperationType.GET, `games/${gameId}`)
    );

    const qMsg = query(
      collection(db, `games/${gameId}/messages`),
      orderBy('createdAt', 'asc')
    );
    const unsubMsg = onSnapshot(qMsg, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }) as ChatMessage));
      setTimeout(() => {
        if (chatRef.current)
          chatRef.current.scrollTop = chatRef.current.scrollHeight;
      }, 50);
    }, e => handleFirestoreError(e, OperationType.LIST, `games/${gameId}/messages`));

    return () => { unsub(); unsubMsg(); };
  }, [gameId, onExit]);

  // ── أسماء اللاعبين ─────────────────────────────────
  useEffect(() => {
    if (!game?.hostId) return;
    getDoc(doc(db, 'users', game.hostId))
      .then(s => s.exists() && setHostName(s.data().displayName))
      .catch(() => {});
  }, [game?.hostId]);

  useEffect(() => {
    if (!game?.guestId) return;
    if (game.guestId === 'bot')   { setGuestName('Computer');         return; }
    if (game.guestId === 'local') { setGuestName('Player 2 (Local)'); return; }
    getDoc(doc(db, 'users', game.guestId))
      .then(s => s.exists() && setGuestName(s.data().displayName))
      .catch(() => {});
  }, [game?.guestId]);

  // ── الأصوات ────────────────────────────────────────
  useEffect(() => {
    if (!game || !prevGameRef.current) { prevGameRef.current = game; return; }
    const prev = prevGameRef.current;

    if (prev.status === 'playing' && game.status === 'finished') {
      const myRole: Role = uid === game.hostId ? 'host' : 'guest';
      playSound(game.winner === myRole ? 'win' : 'lose');
    } else if (prev.turn !== game.turn && prev.board && game.board) {
      const prevCount = prev.board.filter(c => c !== '').length;
      const currCount = game.board.filter(c => c !== '').length;
      if      (currCount > prevCount) playSound('place');
      else if (currCount < prevCount) playSound('capture');
      else                            playSound('move');
    }

    prevGameRef.current = game;
  }, [game, uid]);

  // ── مشتق من حالة اللعبة ────────────────────────────
  const isHost    = uid === game?.hostId;
  const isGuest   = uid === game?.guestId;
  const isLocal   = game?.guestId === 'local';
  const isMyTurn  = isLocal
    || (isHost  && game?.turn === 'host')
    || (isGuest && game?.turn === 'guest');

  // ── commitUpdate — كل writes تمر من هنا ──────────
  const commitUpdate = useCallback(async (updates: Partial<GameDoc>) => {
    const full = { ...updates, updatedAt: serverTimestamp() };
    setGame(prev => prev ? { ...prev, ...updates } : prev);
    try {
      await updateDoc(doc(db, 'games', gameId), full);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `games/${gameId}`);
    }
  }, [gameId]);

  // ── commitTransaction — للـ multiplayer ───────────
  const commitTransaction = useCallback(async (updates: Partial<GameDoc>) => {
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(doc(db, 'games', gameId));
        if (!snap.exists()) throw new Error('Game not found');
        const current = snap.data() as GameDoc;
        // تحقق أن الدور لم يتغير بين النقر والكتابة
        const myRole: Role = isHost ? 'host' : 'guest';
        if (current.turn !== myRole && !isLocal) throw new Error('Not your turn');
        tx.update(doc(db, 'games', gameId), { ...updates, updatedAt: serverTimestamp() });
      });
      setGame(prev => prev ? { ...prev, ...updates } : prev);
    } catch (e: any) {
      if (!e.message?.includes('Not your turn'))
        handleFirestoreError(e, OperationType.UPDATE, `games/${gameId}`);
    }
  }, [gameId, isHost, isLocal]);

  // ── Bot Effect ─────────────────────────────────────
  useEffect(() => {
    if (!game || game.status !== 'playing') return;
    if (game.guestId !== 'bot')             return;
    if (game.turn !== 'guest' || !isHost)   return;

    const timer = setTimeout(async () => {
      const botPiece: Piece = '2';
      const move = getBotMove(game.board, game.phase, botPiece);
      if (!move) return;

      const placed = countPieces(game.board, '1') + countPieces(game.board, '2');

      if (game.phase === 'placement') {
        const newBoard  = [...game.board] as Board;
        newBoard[move.toIdx] = botPiece;
        const next   = placed + 1;
        const isLast = next === MAX_PIECES;
        await commitUpdate({
          board: newBoard,
          turn:  isLast ? 'host' : getNextTurnPlacement(next),
          phase: isLast ? 'movement' : 'placement',
        });
      } else {
        const { board: newBoard, canContinue } = applyMove(
          game.board, move.fromIdx!, move.toIdx, botPiece
        );
        const winner = checkWinner(newBoard, 'guest');
        await commitUpdate({
          board:  newBoard,
          turn:   canContinue ? 'guest' : 'host',
          status: winner ? 'finished' : 'playing',
          winner: winner || '',
        });
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [game?.turn, game?.status, game?.phase, isHost, commitUpdate]);

  // ── handleCellClick ────────────────────────────────
  const handleCellClick = async (idx: number) => {
    if (!game || !isMyTurn || game.status !== 'playing') return;

    const myPiece: Piece = isLocal
      ? (game.turn === 'host' ? '1' : '2')
      : (isHost ? '1' : '2');

    const placed = countPieces(game.board, '1') + countPieces(game.board, '2');
    const isMultiplayer = !isLocal && game.guestId !== 'bot';

    // ── طور التوضع ──────────────────────────────────
    if (game.phase === 'placement') {
      if (idx === CENTER_IDX || game.board[idx] !== '') return;

      const newBoard = [...game.board] as Board;
      newBoard[idx]  = myPiece;
      const next     = placed + 1;
      const isLast   = next === MAX_PIECES;
      const updates  = {
        board: newBoard,
        turn:  (isLast ? 'host' : getNextTurnPlacement(next)) as Role,
        phase: (isLast ? 'movement' : 'placement') as Phase,
      };

      isMultiplayer
        ? await commitTransaction(updates)
        : await commitUpdate(updates);
      return;
    }

    // ── طور الحركة ──────────────────────────────────
    if (game.board[idx] === myPiece) {
      setSelectedIdx(idx);
      return;
    }

    if (selectedIdx === null) return;

    if (!getValidMoves(selectedIdx, game.board).includes(idx)) {
      setSelectedIdx(null);
      return;
    }

    const { board: newBoard, canContinue } = applyMove(
      game.board, selectedIdx, idx, myPiece
    );
    const winner = checkWinner(newBoard, game.turn);

    setSelectedIdx(null);

    const updates = {
      board:  newBoard,
      turn:   (canContinue ? game.turn : (game.turn === 'host' ? 'guest' : 'host')) as Role,
      status: (winner ? 'finished' : 'playing') as GameDoc['status'],
      winner: (winner || '') as Role | '',
    };

    isMultiplayer
      ? await commitTransaction(updates)
      : await commitUpdate(updates);
  };

  // ── Play Again ─────────────────────────────────────
  const handlePlayAgain = () => commitUpdate({
    status: 'playing',
    turn:   'host',
    board:  emptyBoard(),
    winner: '',
    phase:  'placement',
  });

  // ── Chat ───────────────────────────────────────────
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim() || !uid) return;
    try {
      await setDoc(doc(collection(db, `games/${gameId}/messages`)), {
        senderId:  uid,
        text:      chatText.trim(),
        createdAt: serverTimestamp(),
      });
      setChatText('');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `games/${gameId}/messages`);
    }
  };

  // ── renderCell ─────────────────────────────────────
  const renderCell = (idx: number) => {
    const content  = game!.board[idx];
    const isSelected = selectedIdx === idx;
    const isEven  = (Math.floor(idx / 7) + (idx % 7)) % 2 === 0;
    const isValidTarget =
      selectedIdx !== null &&
      game!.phase === 'movement' &&
      getValidMoves(selectedIdx, game!.board).includes(idx);

    return (
      <div
        key={idx}
        onClick={() => handleCellClick(idx)}
        className={cn(
          'w-full pt-[100%] relative cursor-pointer transition-all duration-150',
          isEven
            ? 'board-cell-light hover:brightness-110'
            : 'board-cell-dark  hover:brightness-110',
          isValidTarget && 'ring-1 ring-inset ring-[#D4AF37]/60'
        )}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          {content === '1' && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: isSelected ? 1.1 : 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className={cn(
                'w-[75%] h-[75%] piece-host',
                isSelected && 'ring-2 ring-offset-1 ring-offset-[#5a452a] ring-[#D4AF37]'
              )}
            />
          )}
          {content === '2' && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: isSelected ? 1.1 : 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className={cn(
                'w-[45%] h-[45%] piece-guest',
                isSelected && 'ring-2 ring-offset-1 ring-offset-[#5a452a] ring-[#D4AF37]'
              )}
            />
          )}
          {/* نقطة صغيرة للخلايا الهدف */}
          {isValidTarget && content === '' && (
            <div className="w-[20%] h-[20%] rounded-full bg-[#D4AF37]/40" />
          )}
        </div>
      </div>
    );
  };

  if (!game) {
    return (
      <div className="p-8 text-center luxury-text-gold font-display tracking-widest uppercase animate-pulse">
        {t('loading')}
      </div>
    );
  }

  const myRole: Role = isHost ? 'host' : 'guest';

  return (
    <div className="flex-1 flex flex-col items-center gap-5 w-full max-w-2xl mx-auto mt-4 font-serif">

      {/* Header اللعبة */}
      <div className="flex justify-between items-center w-full luxury-panel p-4">
        <div>
          <h2 className="text-sm font-display font-bold uppercase tracking-[0.2em] luxury-text-gold">
            {t('app_name')}
          </h2>
          <p className="text-[9px] text-[#E6D5B8] opacity-50 uppercase font-display tracking-widest mt-0.5">
            {game.phase === 'placement' ? t('phase_placement') : t('phase_movement')}
          </p>
        </div>
        <button onClick={onExit} className="luxury-btn px-4 py-2 rounded-[2px] text-[10px]">
          Exit Room
        </button>
      </div>

      {/* حالة اللاعبين */}
      <div className="luxury-panel p-5 w-full flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-1">
            <span className={cn(
              'text-xs font-display font-bold uppercase tracking-widest',
              game.turn === 'host' ? 'luxury-text-gold' : 'text-[#E6D5B8] opacity-40'
            )}>
              {hostName}
            </span>
            <span className="text-[8px] px-2 py-0.5 border border-[#4a3a2a] text-[#E6D5B8] opacity-70 uppercase tracking-widest rounded bg-[#12100E] font-display">
              {t('rocks')}
            </span>
          </div>

          <span className="text-[11px] font-bold luxury-text-gold uppercase tracking-[0.4em] font-display">VS</span>

          <div className="flex flex-col items-end gap-1">
            <span className={cn(
              'text-xs font-display font-bold uppercase tracking-widest',
              game.turn === 'guest' ? 'luxury-text-gold' : 'text-[#E6D5B8] opacity-40'
            )}>
              {game.guestId ? guestName : 'Waiting...'}
            </span>
            <span className="text-[8px] px-2 py-0.5 border border-[#4a3a2a] text-[#E6D5B8] opacity-70 uppercase tracking-widest rounded bg-[#12100E] font-display">
              {t('date_pits')}
            </span>
          </div>
        </div>

        <div className="w-full h-px bg-[rgba(212,175,55,0.12)]" />

        {/* حالة اللعبة */}
        {game.status === 'waiting' && (
          <p className="luxury-text-gold animate-pulse font-display text-sm uppercase tracking-[0.2em] text-center">
            {t('waiting_for_opponent')}
          </p>
        )}
        {game.status === 'playing' && (
          <p className={cn(
            'text-sm font-display uppercase tracking-[0.2em] text-center',
            isMyTurn ? 'luxury-text-gold font-bold' : 'text-[#E6D5B8] opacity-40'
          )}>
            {isMyTurn ? t('your_turn') : t('opponent_turn')}
          </p>
        )}
        {game.status === 'finished' && (
          <div className="flex flex-col items-center gap-3">
            <p className={cn(
              'text-xl font-display font-bold uppercase tracking-[0.3em]',
              game.winner === myRole ? 'text-[#D4AF37]' : 'text-red-900/80'
            )}>
              {game.winner === myRole ? t('you_win') : t('you_lose')}
            </p>
            <button onClick={handlePlayAgain} className="luxury-btn-primary px-8 py-3 rounded-[4px] text-xs">
              Play Again
            </button>
          </div>
        )}
      </div>

      {/* اللوح */}
      <div className="w-full flex justify-center">
        <div className="w-full max-w-[420px]">
          <div className="board-outer">
            <div className="grid grid-cols-7 gap-0 border-4 board-grid">
              {Array(49).fill(null).map((_, i) => renderCell(i))}
            </div>
          </div>
          <div className="flex justify-between w-full text-[9px] font-display font-bold uppercase tracking-[0.3em] mt-4 px-1 text-[#D4AF37] opacity-60">
            <span>7 × 7</span>
            <span>{isMyTurn ? '⬤ Action' : '○ Standby'}</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-10 px-6 py-4 luxury-panel w-full">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 piece-host" />
          <span className="text-[9px] uppercase font-bold text-[#E6D5B8] tracking-[0.2em] font-display">
            {t('rocks')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 piece-guest" />
          <span className="text-[9px] uppercase font-bold text-[#E6D5B8] tracking-[0.2em] font-display">
            {t('date_pits')}
          </span>
        </div>
      </div>

      {/* Chat */}
      <div className="w-full luxury-panel flex flex-col h-72 mb-4">
        <h3 className="text-[9px] font-display uppercase font-bold tracking-[0.25em] luxury-text-gold border-b border-[rgba(212,175,55,0.15)] px-6 py-4">
          Room Ledger
        </h3>
        <div ref={chatRef} className="flex-1 overflow-y-auto space-y-3 px-6 py-4">
          {messages.length === 0 ? (
            <p className="text-xs text-center text-[#E6D5B8] opacity-30 mt-4 font-display uppercase tracking-widest leading-loose">
              The records are empty.<br />Speak, traveler.
            </p>
          ) : (
            messages.map(msg => {
              const isMine = msg.senderId === uid;
              const time   = msg.createdAt?.toDate
                ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';
              return (
                <div key={msg.id} className={cn('flex flex-col', isMine ? 'items-end' : 'items-start')}>
                  <div className={cn(
                    'max-w-[85%] px-4 py-2 rounded text-sm border',
                    isMine
                      ? 'bg-[#2c241b] text-[#D4AF37] rounded-br-[2px] border-[rgba(212,175,55,0.5)]'
                      : 'bg-[#12100E] text-[#E6D5B8] rounded-bl-[2px] border-[#4a3a2a]'
                  )}>
                    {msg.text}
                  </div>
                  {time && (
                    <span className="text-[8px] text-[#E6D5B8] opacity-30 font-display mt-1 px-1">
                      {time}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
        <form onSubmit={sendMessage} className="p-4 border-t border-[rgba(212,175,55,0.15)] bg-black/20 flex gap-3">
          <input
            type="text"
            value={chatText}
            onChange={e => setChatText(e.target.value)}
            disabled={game.status === 'waiting'}
            placeholder={game.status === 'waiting' ? 'Waiting for opponent...' : 'Inscribe a message...'}
            className="flex-1 px-4 py-2 bg-[#12100E] border border-[#4a3a2a] rounded-[4px] text-sm text-[#E6D5B8] placeholder:text-[#E6D5B8]/40 focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!chatText.trim() || game.status === 'waiting'}
            className="luxury-btn-primary px-4 py-2 rounded-[4px] disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
                 }
