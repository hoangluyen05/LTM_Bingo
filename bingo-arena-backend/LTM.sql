
-- ==========================================
-- DATABASE: BINGO ONLINE 1VS1
-- MySQL 8.0.16+
-- ==========================================

CREATE DATABASE IF NOT EXISTS bingo_online
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE bingo_online;

-- ==========================================
-- 1. BANG USERS
-- ==========================================

CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    username VARCHAR(50) NOT NULL UNIQUE,

    password_hash VARCHAR(255) NOT NULL,

    display_name VARCHAR(60) NOT NULL,

    created_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP

) ENGINE=InnoDB;


-- ==========================================
-- 2. BANG ROOMS
-- ==========================================


CREATE TABLE IF NOT EXISTS rooms (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    room_code VARCHAR(12) NOT NULL UNIQUE,

    host_user_id BIGINT NOT NULL,

    guest_user_id BIGINT DEFAULT NULL,

    status ENUM(
        'WAITING',
        'PLAYING',
        'CLOSED'
    ) NOT NULL DEFAULT 'WAITING',

    created_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    closed_at DATETIME DEFAULT NULL,

    CONSTRAINT fk_rooms_host
        FOREIGN KEY (host_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_rooms_guest
        FOREIGN KEY (guest_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    INDEX idx_rooms_status (status)

) ENGINE=InnoDB;



-- ==========================================
-- 3. BANG MATCHES
-- ==========================================

CREATE TABLE IF NOT EXISTS matches (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    room_id BIGINT NOT NULL,

    status ENUM(
        'PLAYING',
        'FINISHED',
        'ABANDONED'
    ) NOT NULL DEFAULT 'PLAYING',

    current_turn_user_id BIGINT DEFAULT NULL,

    winner_user_id BIGINT DEFAULT NULL,

    started_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    ended_at DATETIME DEFAULT NULL,

    CONSTRAINT fk_matches_room
        FOREIGN KEY (room_id)
        REFERENCES rooms(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_matches_current_turn
        FOREIGN KEY (current_turn_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_matches_winner
        FOREIGN KEY (winner_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT chk_matches_time
        CHECK (
            ended_at IS NULL
            OR ended_at >= started_at
        ),

    INDEX idx_matches_room (room_id),
    INDEX idx_matches_status (status)

) ENGINE=InnoDB;


-- ==========================================
-- 4. BANG MATCH_PLAYERS
-- ==========================================

CREATE TABLE IF NOT EXISTS match_players (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    match_id BIGINT NOT NULL,

    user_id BIGINT NOT NULL,

    board_json JSON NOT NULL,

    bingo_lines TINYINT UNSIGNED NOT NULL
        DEFAULT 0,

    marked_count TINYINT UNSIGNED NOT NULL
        DEFAULT 0,

    result ENUM(
        'UNFINISHED',
        'WIN',
        'LOSE'
    ) NOT NULL DEFAULT 'UNFINISHED',

    CONSTRAINT fk_match_players_match
        FOREIGN KEY (match_id)
        REFERENCES matches(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_match_players_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT uq_match_player
        UNIQUE (match_id, user_id),

    CONSTRAINT chk_bingo_lines
        CHECK (bingo_lines BETWEEN 0 AND 12),

    CONSTRAINT chk_marked_count
        CHECK (marked_count BETWEEN 0 AND 25),

    INDEX idx_match_players_user (user_id)

) ENGINE=InnoDB;


-- ==========================================
-- 5. BANG CALLED_NUMBERS
-- ==========================================

CREATE TABLE IF NOT EXISTS called_numbers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    match_id BIGINT NOT NULL,

    turn_no TINYINT UNSIGNED NOT NULL,

    called_number TINYINT UNSIGNED NOT NULL,

    called_by_user_id BIGINT NOT NULL,

    called_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_called_numbers_match
        FOREIGN KEY (match_id)
        REFERENCES matches(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_called_numbers_user
        FOREIGN KEY (called_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT uq_match_turn
        UNIQUE (match_id, turn_no),

    CONSTRAINT uq_match_called_number
        UNIQUE (match_id, called_number),

    CONSTRAINT chk_turn_no
        CHECK (turn_no BETWEEN 1 AND 25),

    CONSTRAINT chk_called_number
        CHECK (called_number BETWEEN 1 AND 25),

    INDEX idx_called_numbers_user
        (called_by_user_id)

) ENGINE=InnoDB;


-- ==========================================
-- KIEM TRA DATABASE
-- ==========================================

SHOW TABLES;

DESCRIBE users;
DESCRIBE rooms;
DESCRIBE matches;
DESCRIBE match_players;
DESCRIBE called_numbers;
