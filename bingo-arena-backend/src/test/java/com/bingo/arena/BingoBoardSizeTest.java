package com.bingo.arena;

import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class BingoBoardSizeTest {
    @Test void supportsEverySize() {
        for (int size = 5; size <= 8; size++) {
            var board = BingoRules.board(size);
            assertEquals(size, board.size());
            for (var row : board) assertEquals(size, row.size());
            var numbers = new HashSet<Integer>();
            board.forEach(numbers::addAll);
            assertEquals(size * size, numbers.size());
            for (int n = 1; n <= size * size; n++) assertTrue(numbers.contains(n));
            assertEquals(2 * size + 2, BingoRules.lines(board, numbers));
            assertEquals(1, BingoRules.lines(board, new HashSet<>(board.get(0))));
            var diagonal = new HashSet<Integer>();
            for (int i = 0; i < size; i++) diagonal.add(board.get(i).get(size - 1 - i));
            assertEquals(1, BingoRules.lines(board, diagonal));
            assertEquals(0, BingoRules.lines(board, Set.of()));
        }
    }
    @Test void rejectsUnsupportedSizes() {
        assertThrows(IllegalArgumentException.class, () -> BingoRules.board(4));
        assertThrows(IllegalArgumentException.class, () -> BingoRules.board(9));
    }
}
