-- Run before starting the updated backend on an existing database.
USE bingo_online;
ALTER TABLE match_players MODIFY COLUMN result
    ENUM('UNFINISHED', 'WIN', 'LOSE', 'DRAW') NOT NULL DEFAULT 'UNFINISHED';
