package com.bingo.arena;

import java.util.*;

public final class BingoRules {
    private BingoRules() {
    }

    public static List<List<Integer>> board() {
        List<Integer> nums = new ArrayList<>();
        for (int i = 1; i <= 25; i++)
            nums.add(i);
        Collections.shuffle(nums, new java.security.SecureRandom());
        List<List<Integer>> b = new ArrayList<>();
        for (int r = 0; r < 5; r++)
            b.add(new ArrayList<>(nums.subList(r * 5, r * 5 + 5)));
        return b;
    }

    public static int lines(List<List<Integer>> board, Set<Integer> called) {
        int count = 0;
        for (int i = 0; i < 5; i++) {
            boolean row = true, col = true;
            for (int j = 0; j < 5; j++) {
                row &= called.contains(board.get(i).get(j));
                col &= called.contains(board.get(j).get(i));
            }
            if (row)
                count++;
            if (col)
                count++;
        }
        boolean a = true, b = true;
        for (int i = 0; i < 5; i++) {
            a &= called.contains(board.get(i).get(i));
            b &= called.contains(board.get(i).get(4 - i));
        }
        if (a)
            count++;
        if (b)
            count++;
        return count;
    }
}
