package com.bingo.arena;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;
import java.util.stream.IntStream;
import static org.mockito.Mockito.*;

class GameOutcomeTest {
    private final JdbcTemplate db = mock(JdbcTemplate.class);
    private final GameSocket socket = mock(GameSocket.class);
    private final ObjectMapper json = new ObjectMapper();
    private final GameService service = new GameService(db, mock(Auth.class), json, socket);

    @Test void simultaneousBingosSaveDrawForBothAndNotifyPlayers() throws Exception {
        when(db.queryForList(contains("WHERE m.id=? FOR UPDATE"), eq(10L)))
                .thenReturn(List.of(Map.of("status", "PLAYING", "host_user_id", 1L,
                        "guest_user_id", 2L, "current_turn_user_id", 1L, "room_id", 3L, "room_code", "BG-1234")));
        String board = json.writeValueAsString(IntStream.range(0, 5)
                .mapToObj(r -> IntStream.rangeClosed(r * 5 + 1, r * 5 + 5).boxed().toList()).toList());
        when(db.queryForList(contains("SELECT board_json"), eq(10L), eq(1L)))
                .thenReturn(List.of(Map.of("board_json", board)));
        when(db.queryForList(contains("SELECT called_number"), eq(10L)))
                .thenReturn(IntStream.rangeClosed(1, 19).mapToObj(n -> Map.<String, Object>of("called_number", n)).toList());
        when(db.queryForList(contains("SELECT user_id,board_json"), eq(10L)))
                .thenReturn(List.of(Map.of("user_id", 1L, "board_json", board), Map.of("user_id", 2L, "board_json", board)));
        service.call(10, 1, 21);
        verify(db).update(contains("SET bingo_lines=?,marked_count=?"), eq(5), eq(20), eq(10L), eq(1L));
        verify(db).update(contains("SET bingo_lines=?,marked_count=?"), eq(5), eq(20), eq(10L), eq(2L));
        verify(db).update(contains("winner_user_id=?"), isNull(), eq(10L));
        verify(db).update("UPDATE match_players SET result='DRAW' WHERE match_id=?", 10L);
        verify(db).update(contains("UPDATE rooms SET status='CLOSED'"), eq(3L));
        verify(socket).publishFinished(10L);
    }

    @Test void leavingAnActiveMatchAwardsWinToOpponent() {
        when(db.queryForList(contains("SELECT * FROM rooms"), eq("BG-1234")))
                .thenReturn(List.of(Map.of("id", 3L, "room_code", "BG-1234", "status", "PLAYING",
                        "host_user_id", 1L, "guest_user_id", 2L)));
        when(db.queryForList(contains("SELECT id FROM matches"), eq(3L)))
                .thenReturn(List.of(Map.of("id", 10L)));
        when(db.update(contains("WHERE id=? AND status IN"), eq(2L), eq(10L))).thenReturn(1);
        service.leave("BG-1234", 1L);
        verify(db).update(contains("winner_user_id=?"), eq(2L), eq(10L));
        verify(db).update(contains("WHEN user_id=? THEN 'WIN' ELSE 'LOSE'"), eq(2L), eq(10L));
        verify(socket).publishFinished(10L);
    }
}
