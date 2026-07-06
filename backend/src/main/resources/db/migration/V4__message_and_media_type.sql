ALTER TABLE messages
    ALTER COLUMN media_key TYPE VARCHAR(255) USING (media_key::VARCHAR(255));

ALTER TABLE messages
    ALTER COLUMN message_type TYPE VARCHAR(255) USING (message_type::VARCHAR(255));