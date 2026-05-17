import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
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
import { Send, Users, Bot, Smartphone, ArrowLeft, Circle } from 'lucide-react';

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

  const gameModes = [
    { 
      id: 'online', 
      icon: Users, 
      label: t('create_game'), 
      desc: 'Play with friends',
      action: () => createGame('', 'waiting') 
    },
    { 
      id: 'bot', 
      icon: Bot, 
      label: 'vs AI', 
      desc: 'Challenge the bot',
      action: () => createGame('bot', 'playing') 
    },
    { 
      id: 'local', 
      icon: Smartphone, 
      label: 'Local', 
      desc: 'Pass & Play',
      action: () => createGame('local', 'playing') 
    },
  ];

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        
        {/* Game Modes */}
        <div className="card-elevated p-6 space-y-5">
          <div className="text-center">
            <h2 className="text-lg font-display text-gold-glow">{t('create_game')}</h2>
            <p className="text-xs text-[#6B6560] mt-1">Choose game mode</p>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {gameModes.map(({ id, icon: Icon, label, desc, action }) => (
              <button
                key={id}
                onClick={action}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#0F0E0C] border border-[#C9A55C]/10 hover:border-[#C9A55C]/30 hover:bg-[#C9A55C]/5 transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-lg bg-[#C9A55C]/10 flex items-center justify-center group-hover:bg-[#C9A55C]/20 transition-colors">
                  <Icon size={20} className="text-[#C9A55C]" />
                </div>
                <span className="text-xs font-medium text-[#F5F0E8]">{label}</span>
                <span className="text-[10px] text-[#6B6560]">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Available Games */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[#A8A095]">{t('available_games')}</h3>
            <span className="status-badge status-playing">
              <span className="status-dot bg-[#4ADE80]" />
              Live
            </span>
          </div>
          
          {games.length === 0 ? (
            <div className="py-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#C9A55C]/5 flex items-center justify-center mx-auto mb-3">
                <Users size={20} className="text-[#6B6560]" />
              </div>
              <p className="text-sm text-[#6B6560]">{t('no_games')}</p>
              <p className="text-xs text-[#4A4540] mt-1">Create a game to start playing</p>
            </div>
          ) : (
            <div className="space-y-2">
              {games.map(game => (
                <div
                  key={game.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#0F0E0C] border border-[#C9A55C]/10 hover:border-[#C9A55C]/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="player-indicator active" />
                    <span className="text-sm font-medium text-[#F5F0E8]">
                      Game #{game.id.slice(0, 6)}
                    </span>
                  </div>
                  <button
                    onClick={() => joinGame(game.id)}
                    className="btn btn-primary !py-2 !px-4 !text-xs"
                  >
                    {t('join_game')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-center gap-2 py-2">
          <div className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse" />
          <span className="text-[10px] text-[#6B6560] uppercase tracking-wider">Connected</span>
        </div>
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
  const [showChat, setShowChat]   = useState(false);
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

  // ── Player Names ─────────────────────────────────
  useEffect(() => {
    if (!game?.hostId) return;
    getDoc(doc(db, 'users', game.hostId))
      .then(s => s.exists() && setHostName(s.data().displayName))
      .catch(() => {});
  }, [game?.hostId]);

  useEffect(() => {
    if (!game?.guestId) return;
    if (game.guestId === 'bot')   { setGuestName('Computer');         return; }
    if (game.guestId === 'local') { setGuestName('Player 2'); return; }
    getDoc(doc(db, 'users', game.guestId))
      .then(s => s.exists() && setGuestName(s.data().displayName))
      .catch(() => {});
  }, [game?.guestId]);

  // ── Sounds ────────────────────────────────────────
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

  // ── Derived State ────────────────────────────
  const isHost    = uid === game?.hostId;
  const isGuest   = uid === game?.guestId;
  const isLocal   = game?.guestId === 'local';
  const isMyTurn  = isLocal
    || (isHost  && game?.turn === 'host')
    || (isGuest && game?.turn === 'guest');

  // ── commitUpdate ──────────
  const commitUpdate = useCallback(async (updates: Partial<GameDoc>) => {
    const full = { ...updates, updatedAt: serverTimestamp() };
    setGame(prev => prev ? { ...prev, ...updates } : prev);
    try {
      await updateDoc(doc(db, 'games', gameId), full);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `games/${gameId}`);
    }
  }, [gameId]);

  // ── commitTransaction ───────────
  const commitTransaction = useCallback(async (updates: Partial<GameDoc>) => {
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(doc(db, 'games', gameId));
        if (!snap.exists()) throw new Error('Game not found');
        const current = snap.data() as GameDoc;
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

    // Placement phase
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

    // Movement phase
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
          'cell',
          isEven ? 'cell-light' : 'cell-dark',
          isValidTarget && 'cell-valid'
        )}
      >
        {content === '1' && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: isSelected ? 1.1 : 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={cn('piece piece-rock', isSelected && 'piece-selected')}
          />
        )}
        {content === '2' && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: isSelected ? 1.1 : 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={cn('piece piece-seed', isSelected && 'piece-selected')}
          />
        )}
      </div>
    );
  };

  if (!game) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C9A55C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const myRole: Role = isHost ? 'host' : 'guest';

  return (
    <div className="flex-1 flex flex-col items-center px-4 py-4 sm:py-6 max-w-md mx-auto w-full">
      
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-4">
        <button onClick={onExit} className="btn btn-ghost !p-2.5">
          <ArrowLeft size={18} />
        </button>
        <div className="text-center">
          <h2 className="text-sm font-display text-gold">{t('app_name')}</h2>
          <p className="text-[10px] text-[#6B6560] capitalize">
            {game.phase === 'placement' ? t('phase_placement') : t('phase_movement')}
          </p>
        </div>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Players Status */}
      <div className="w-full card-game p-4 mb-4 space-y-3">
        <div className="flex items-center justify-between">
          {/* Host */}
          <div className={cn(
            'player-badge flex-1 max-w-[140px]',
            game.turn === 'host' && 'active'
          )}>
            <div className={cn('player-indicator', game.turn === 'host' && 'active')} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[#F5F0E8] truncate">{hostName}</p>
              <p className="text-[9px] text-[#6B6560]">{t('rocks')}</p>
            </div>
          </div>

          <span className="text-xs font-medium text-[#C9A55C] px-3">VS</span>

          {/* Guest */}
          <div className={cn(
            'player-badge flex-1 max-w-[140px] flex-row-reverse text-right',
            game.turn === 'guest' && 'active'
          )}>
            <div className={cn('player-indicator', game.turn === 'guest' && 'active')} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[#F5F0E8] truncate">
                {game.guestId ? guestName : 'Waiting...'}
              </p>
              <p className="text-[9px] text-[#6B6560]">{t('date_pits')}</p>
            </div>
          </div>
        </div>

        {/* Game Status */}
        <div className="text-center py-2">
          {game.status === 'waiting' && (
            <div className="status-badge status-waiting mx-auto">
              <span className="status-dot bg-[#C9A55C]" />
              {t('waiting_for_opponent')}
            </div>
          )}
          {game.status === 'playing' && (
            <p className={cn(
              'text-sm font-medium',
              isMyTurn ? 'text-[#C9A55C]' : 'text-[#6B6560]'
            )}>
              {isMyTurn ? t('your_turn') : t('opponent_turn')}
            </p>
          )}
          {game.status === 'finished' && (
            <div className="space-y-3">
              <p className={cn(
                'text-xl font-display font-bold',
                game.winner === myRole ? 'text-[#C9A55C]' : 'text-[#EF4444]'
              )}>
                {game.winner === myRole ? t('you_win') : t('you_lose')}
              </p>
              <button onClick={handlePlayAgain} className="btn btn-primary">
                Play Again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Board */}
      <div className="w-full flex justify-center mb-4">
        <div className="w-full max-w-[340px]">
          <div className="board-container">
            <div className="board-grid">
              {Array(49).fill(null).map((_, i) => renderCell(i))}
            </div>
          </div>
          <div className="flex justify-between mt-3 px-1 text-[10px] text-[#6B6560]">
            <span>7 x 7</span>
            <span className={isMyTurn ? 'text-[#C9A55C]' : ''}>
              {isMyTurn ? 'Your Move' : 'Waiting'}
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-8 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 piece piece-rock" />
          <span className="text-xs text-[#A8A095]">{t('rocks')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 piece piece-seed" />
          <span className="text-xs text-[#A8A095]">{t('date_pits')}</span>
        </div>
      </div>

      {/* Chat Section */}
      <div className="w-full chat-container flex flex-col flex-1 min-h-[200px] max-h-[280px]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#C9A55C]/10">
          <h3 className="text-xs font-medium text-[#A8A095]">Chat</h3>
          <span className="text-[10px] text-[#6B6560]">{messages.length} messages</span>
        </div>
        
        <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <p className="text-center text-xs text-[#6B6560] py-8">
              No messages yet
            </p>
          ) : (
            messages.map(msg => {
              const isMine = msg.senderId === uid;
              const time = msg.createdAt?.toDate
                ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';
              return (
                <div key={msg.id} className={cn('flex flex-col', isMine ? 'items-end' : 'items-start')}>
                  <div className={cn(
                    'chat-message',
                    isMine ? 'chat-message-mine' : 'chat-message-other'
                  )}>
                    {msg.text}
                  </div>
                  {time && (
                    <span className="text-[9px] text-[#6B6560] mt-1 px-1">{time}</span>
                  )}
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={sendMessage} className="p-3 border-t border-[#C9A55C]/10 flex gap-2">
          <input
            type="text"
            value={chatText}
            onChange={e => setChatText(e.target.value)}
            disabled={game.status === 'waiting'}
            placeholder={game.status === 'waiting' ? 'Waiting...' : 'Type a message...'}
            className="chat-input flex-1"
          />
          <button
            type="submit"
            disabled={!chatText.trim() || game.status === 'waiting'}
            className="btn btn-primary !p-3"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
