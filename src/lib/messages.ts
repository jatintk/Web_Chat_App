import { pool } from './db';
import { assertSessionAccess } from './sessions';
import { pusherServer } from './pusherServer';

export type ChatMessage = {
  id: string;
  sessionId: string;
  senderId: string;
  senderName: string | null;
  senderRole: 'user' | 'expert';
  body: string;
  createdAt: string;
};

export class EmptyMessageError extends Error {
  constructor() {
    super('Message cannot be empty.');
    this.name = 'EmptyMessageError';
  }
}

function pusherChannelName(sessionId: string): string {
  return `private-session-${sessionId}`;
}

export async function listMessages(callerId: string, sessionId: string): Promise<ChatMessage[]> {
  await assertSessionAccess(callerId, sessionId);

  const result = await pool.query(
    `SELECT m.id, m.session_id, m.sender_id, m.body, m.created_at, u.name AS sender_name, u.role AS sender_role
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.session_id = $1
     ORDER BY m.created_at ASC`,
    [sessionId]
  );

  return result.rows.map(rowToMessage);
}

export async function sendMessage(callerId: string, sessionId: string, body: string): Promise<ChatMessage> {
  const trimmed = body.trim();
  if (!trimmed) throw new EmptyMessageError();

  await assertSessionAccess(callerId, sessionId);

  const result = await pool.query(
    `WITH inserted AS (
       INSERT INTO messages (session_id, sender_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, session_id, sender_id, body, created_at
     )
     SELECT inserted.*, u.name AS sender_name, u.role AS sender_role
     FROM inserted JOIN users u ON u.id = inserted.sender_id`,
    [sessionId, callerId, trimmed]
  );

  const message = rowToMessage(result.rows[0]);

  await pusherServer.trigger(pusherChannelName(sessionId), 'new-message', message);

  return message;
}

function rowToMessage(row: {
  id: string;
  session_id: string;
  sender_id: string;
  sender_name: string | null;
  sender_role: string;
  body: string;
  created_at: string;
}): ChatMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderRole: row.sender_role === 'expert' ? 'expert' : 'user',
    body: row.body,
    createdAt: row.created_at,
  };
}
