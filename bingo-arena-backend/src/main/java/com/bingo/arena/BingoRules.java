package com.bingo.arena;

import java.util.*;

public final class BingoRules {
    private BingoRules() {
    }

    public static List<List<Integer>> board() {
        return board(5);
    }

    public static List<List<Integer>> board(int size) {
        if (size < 5 || size > 8) throw new IllegalArgumentException("Board size must be 5 to 8");
        List<Integer> nums = new ArrayList<>();
        for (int i = 1; i <= size * size; i++)
            nums.add(i);
        Collections.shuffle(nums, new java.security.SecureRandom());
        List<List<Integer>> b = new ArrayList<>();
        for (int r = 0; r < size; r++)
            b.add(new ArrayList<>(nums.subList(r * size, r * size + size)));
        return b;
    }

    public static int lines(List<List<Integer>> board, Set<Integer> called) {
        int size = board.size();
        int count = 0;
        for (int i = 0; i < size; i++) {
            boolean row = true, col = true;
            for (int j = 0; j < size; j++) {
                row &= called.contains(board.get(i).get(j));
                col &= called.contains(board.get(j).get(i));
            }
            if (row)
                count++;
            if (col)
                count++;
        }
        boolean a = true, b = true;
        for (int i = 0; i < size; i++) {
            a &= called.contains(board.get(i).get(i));
            b &= called.contains(board.get(i).get(size - 1 - i));
        }
        if (a)
            count++;
        if (b)
            count++;
        return count;
    }
}
