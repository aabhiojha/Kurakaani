ALTER TABLE messages ADD COLUMN content_tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;

CREATE INDEX idx_messages_content_tsv ON messages USING GIN (content_tsv);
