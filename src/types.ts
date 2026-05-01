import type { Board, Phase, GameStatus, Role } from './lib/gameLogic';

// ── مستخدم Firestore ───────────────────────────────────
export interface UserProfile {
  uid:         string;
  email:       string;
  displayName: string;
  createdAt:   any;           // Firestore Timestamp
}

// ── وثيقة اللعبة في Firestore ──────────────────────────
export interface GameDoc {
  id:        string;
  status:    GameStatus;
  hostId:    string;
  guestId:   string;          // uid | 'bot' | 'local' | ''
  turn:      Role;
  board:     Board;
  phase:     Phase;
  winner:    Role | '';
  createdAt: any;
  updatedAt: any;
}

// ── رسالة الـ Chat ─────────────────────────────────────
export interface ChatMessage {
  id:        string;
  senderId:  string;
  text:      string;
  createdAt: any;
}

// ── Props مشتركة ───────────────────────────────────────
export interface GameBoardProps {
  gameId: string;
  onExit: () => void;
}
