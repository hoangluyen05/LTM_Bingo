package com.bingo.arena;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ChatServiceTest {
    @Test void trimsTextAndRejectsInvalidPayloads() {
        assertEquals("Good luck!", ChatService.validateContent("TEXT", "  Good luck!  "));
        assertThrows(ApiError.class, () -> ChatService.validateContent("TEXT", "   "));
        assertThrows(ApiError.class, () -> ChatService.validateContent("TEXT", "x".repeat(501)));
        assertThrows(ApiError.class, () -> ChatService.validateContent("TEXT", null));
        assertThrows(ApiError.class, () -> ChatService.validateContent("HTML", "<script>"));
        for (String id : List.of("laugh", "celebrate", "cry", "angry", "surprised", "cool"))
            assertEquals(id, ChatService.validateContent("STICKER", id));
        assertThrows(ApiError.class, () -> ChatService.validateContent("STICKER", "../../anything.wav"));
    }

    @Test void nonMembersCannotReadOrSend() {
        var db = mock(JdbcTemplate.class);
        var chat = new ChatService(db);
        assertThrows(ApiError.class, () -> chat.history(10, 99));
        assertThrows(ApiError.class, () -> chat.post(10, 99, "TEXT", "hello"));
        verify(db, never()).update(any(org.springframework.jdbc.core.PreparedStatementCreator.class),
                any(org.springframework.jdbc.support.KeyHolder.class));
    }

    @Test void finishedMatchesRejectNewMessages() {
        var db = mock(JdbcTemplate.class);
        when(db.queryForList(contains("SELECT m.status"), eq(10L), eq(99L), eq(99L)))
                .thenReturn(List.of(Map.of("status", "FINISHED")));
        assertThrows(ApiError.class, () -> new ChatService(db).post(10, 99, "TEXT", "hello"));
    }

    @Test void burstMessagesAreRejected() {
        var db = mock(JdbcTemplate.class);
        when(db.queryForList(contains("SELECT m.status"), eq(10L), eq(99L), eq(99L)))
                .thenReturn(List.of(Map.of("status", "PLAYING")));
        when(db.queryForObject(contains("SELECT COUNT(*)"), eq(Integer.class), eq(10L), eq(99L), anyLong()))
                .thenReturn(3);
        ApiError error = assertThrows(ApiError.class, () -> new ChatService(db).post(10, 99, "STICKER", "laugh"));
        assertEquals("CHAT_RATE_LIMIT", error.code);
    }
}
