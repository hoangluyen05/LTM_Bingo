package com.bingo.arena;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
class BingoRulesTest {
 @Test void boardContainsExactlyOneToTwentyFive(){var b=BingoRules.board();assertEquals(5,b.size());var numbers=b.stream().flatMap(List::stream).toList();assertEquals(25,new HashSet<>(numbers).size());assertEquals(25,numbers.size());assertTrue(numbers.containsAll(java.util.stream.IntStream.rangeClosed(1,25).boxed().toList()));}
 @Test void countsRowsColumnsAndDiagonals(){var b=List.of(List.of(1,2,3,4,5),List.of(6,7,8,9,10),List.of(11,12,13,14,15),List.of(16,17,18,19,20),List.of(21,22,23,24,25));assertEquals(1,BingoRules.lines(b,Set.of(1,2,3,4,5)));assertEquals(12,BingoRules.lines(b,new HashSet<>(java.util.stream.IntStream.rangeClosed(1,25).boxed().toList())));}
}
