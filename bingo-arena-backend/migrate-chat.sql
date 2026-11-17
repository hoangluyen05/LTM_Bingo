-- Run on existing installations before using chat. Safe to run again.
USE bingo_online;
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    match_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    message_type VARCHAR(10) NOT NULL,
    content VARCHAR(500) NOT NULL,
    created_at_ms BIGINT NOT NULL,
    CONSTRAINT fk_chat_match FOREIGN KEY (match_id) REFERENCES matches(id),
    CONSTRAINT fk_chat_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT chk_chat_type CHECK (message_type IN ('TEXT', 'STICKER')),
    INDEX idx_chat_match (match_id, id),
    INDEX idx_chat_rate (match_id, user_id, created_at_ms)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
