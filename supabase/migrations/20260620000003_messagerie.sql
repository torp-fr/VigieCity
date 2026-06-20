-- =============================================================================
-- Migration : Messagerie bidirectionnelle citoyen ↔ commune
-- Session 5 — M5
-- =============================================================================

CREATE TABLE IF NOT EXISTS conversations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  collectivity_id UUID        NOT NULL REFERENCES collectivities(id) ON DELETE CASCADE,
  citizen_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject         TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'open',
  -- open | closed | archived
  unread_admin    INT         NOT NULL DEFAULT 0,
  unread_citizen  INT         NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_collectivity
  ON conversations (collectivity_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_citizen
  ON conversations (citizen_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_from_admin   BOOLEAN     NOT NULL DEFAULT false,
  content         TEXT        NOT NULL,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages (conversation_id, created_at ASC);

CREATE OR REPLACE FUNCTION update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversations_updated_at();

CREATE OR REPLACE FUNCTION on_message_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_from_admin THEN
    UPDATE conversations
    SET last_message_at = NEW.created_at,
        unread_citizen  = unread_citizen + 1
    WHERE id = NEW.conversation_id;
  ELSE
    UPDATE conversations
    SET last_message_at = NEW.created_at,
        unread_admin    = unread_admin + 1
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_after_insert
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION on_message_insert();

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_citizen_select" ON conversations
  FOR SELECT USING (citizen_id = auth.uid());

CREATE POLICY "conversations_citizen_insert" ON conversations
  FOR INSERT WITH CHECK (
    citizen_id = auth.uid()
    AND collectivity_id IN (
      SELECT collectivity_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "conversations_citizen_update" ON conversations
  FOR UPDATE USING (citizen_id = auth.uid());

CREATE POLICY "conversations_admin_all" ON conversations
  FOR ALL
  USING (
    collectivity_id IN (
      SELECT ur.collectivity_id FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    collectivity_id IN (
      SELECT ur.collectivity_id FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "messages_citizen_select" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE citizen_id = auth.uid()
    )
  );

CREATE POLICY "messages_citizen_insert" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND is_from_admin = false
    AND conversation_id IN (
      SELECT id FROM conversations
      WHERE citizen_id = auth.uid() AND status = 'open'
    )
  );

CREATE POLICY "messages_admin_select" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT c.id FROM conversations c
      JOIN user_roles ur ON ur.collectivity_id = c.collectivity_id
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "messages_admin_insert" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND is_from_admin = true
    AND conversation_id IN (
      SELECT c.id FROM conversations c
      JOIN user_roles ur ON ur.collectivity_id = c.collectivity_id
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'moderator')
    )
  );
