-- Run once on an existing database before starting the updated backend.
USE bingo_online;
ALTER TABLE rooms ADD COLUMN board_size TINYINT UNSIGNED NOT NULL DEFAULT 5,
    ADD CONSTRAINT chk_board_size CHECK (board_size BETWEEN 5 AND 8);
ALTER TABLE match_players DROP CHECK chk_bingo_lines, DROP CHECK chk_marked_count,
    ADD CONSTRAINT chk_bingo_lines CHECK (bingo_lines BETWEEN 0 AND 18),
    ADD CONSTRAINT chk_marked_count CHECK (marked_count BETWEEN 0 AND 64);
ALTER TABLE called_numbers DROP CHECK chk_turn_no, DROP CHECK chk_called_number,
    ADD CONSTRAINT chk_turn_no CHECK (turn_no BETWEEN 1 AND 64),
    ADD CONSTRAINT chk_called_number CHECK (called_number BETWEEN 1 AND 64);
