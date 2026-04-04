/**
 * Chat flow — schema compliance tests
 *
 * Ensures chat inserts match production schema:
 * - chat_threads: id, participant_ids, unread_count, last_message, updated_at
 *   (NO created_by column)
 * - chat_messages: id, thread_id, sender_email, content, message_type, created_at
 *   (NO metadata column, NO sender_name column)
 */
import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Scan the actual source files for schema violations
const CHAT_FILES = [
  'src/components/sheets/L2ChatSheet.jsx',
  'src/components/messaging/ChatThread.jsx',
  'src/pages/SquadChat.jsx',
  'src/hooks/useChat.ts',
  'src/hooks/useUnreadCount.ts',
];

function readFileIfExists(filePath: string): string {
  const abs = path.resolve(filePath);
  try { return fs.readFileSync(abs, 'utf8'); } catch { return ''; }
}

describe('Chat schema compliance', () => {
  it('no chat file inserts created_by into chat_threads', () => {
    for (const file of CHAT_FILES) {
      const src = readFileIfExists(file);
      if (!src) continue;
      // Look for created_by near chat_threads insert
      const threadInserts = src.match(/\.from\(['"]chat_threads['"]\)[\s\S]{0,200}\.insert/g) || [];
      for (const block of threadInserts) {
        expect(block).not.toContain('created_by');
      }
    }
  });

  it('no chat file inserts metadata into chat_messages', () => {
    for (const file of CHAT_FILES) {
      const src = readFileIfExists(file);
      if (!src) continue;
      const msgInserts = src.match(/\.from\(['"]chat_messages['"]\)[\s\S]{0,300}\.insert/g) || [];
      for (const block of msgInserts) {
        // metadata as a column key (not inside a string value)
        expect(block).not.toMatch(/\bmetadata\s*:/);
      }
    }
  });

  it('no chat file inserts sender_name into chat_messages', () => {
    for (const file of CHAT_FILES) {
      const src = readFileIfExists(file);
      if (!src) continue;
      const msgInserts = src.match(/\.from\(['"]chat_messages['"]\)[\s\S]{0,300}\.insert/g) || [];
      for (const block of msgInserts) {
        expect(block).not.toMatch(/\bsender_name\s*:/);
      }
    }
  });

  it('chat_messages inserts include required fields', () => {
    // At least L2ChatSheet should have thread_id, sender_email, content
    const src = readFileIfExists('src/components/sheets/L2ChatSheet.jsx');
    if (!src) return;
    const inserts = src.match(/\.from\(['"]chat_messages['"]\)[\s\S]{0,400}\.insert\(\{[\s\S]*?\}\)/g) || [];
    expect(inserts.length).toBeGreaterThan(0);
    for (const block of inserts) {
      expect(block).toContain('thread_id');
      expect(block).toContain('sender_email');
      expect(block).toContain('content');
    }
  });

  it('chat_threads inserts include participant_emails', () => {
    const src = readFileIfExists('src/components/sheets/L2ChatSheet.jsx');
    if (!src) return;
    const inserts = src.match(/\.from\(['"]chat_threads['"]\)[\s\S]{0,400}\.insert\(\{[\s\S]*?\}\)/g) || [];
    expect(inserts.length).toBeGreaterThan(0);
    for (const block of inserts) {
      expect(block).toContain('participant_emails');
      // Must NOT have created_by (column doesn't exist in prod)
      expect(block).not.toContain('created_by');
    }
  });
});
