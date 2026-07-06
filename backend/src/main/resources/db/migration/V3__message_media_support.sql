ALTER TABLE messages
    ADD COLUMN message_type VARCHAR(32) NOT NULL DEFAULT 'TEXT';

ALTER TABLE messages
    ADD COLUMN media_key VARCHAR(512);

ALTER TABLE messages
    ADD COLUMN media_content_type VARCHAR(255);

ALTER TABLE messages
    ADD COLUMN media_file_name VARCHAR(255);
