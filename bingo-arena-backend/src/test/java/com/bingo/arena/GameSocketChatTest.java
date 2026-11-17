package com.bingo.arena;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.web.socket.*;
import java.util.*;
import static org.mockito.Mockito.*;

class GameSocketChatTest {
    private final ObjectMapper json = new ObjectMapper();

    private void receive(GameSocket socket, WebSocketSession session, String type, Map<String, Object> payload) throws Exception {
        socket.handleTextMessage(session, new TextMessage(json.writeValueAsString(Map.of("type", type, "payload", payload))));
    }

    private WebSocketSession connect(GameSocket socket, String id, long mid) throws Exception {
        var session = mock(WebSocketSession.class);
        when(session.getId()).thenReturn(id);
        when(session.isOpen()).thenReturn(true);
        socket.afterConnectionEstablished(session);
        receive(socket, session, "AUTH", Map.of("token", "valid"));
        receive(socket, session, "SUBSCRIBE_MATCH", Map.of("matchId", mid));
        clearInvocations(session);
        return session;
    }

    @SuppressWarnings("unchecked")
    @Test void broadcastsOnlyToSubscribedMatchAndSeparatesChatErrors() throws Exception {
        var auth = mock(Auth.class);
        when(auth.verify("valid")).thenReturn(7L);
        var game = mock(GameService.class);
        when(game.matchView(anyLong(), eq(7L))).thenReturn(Map.of("status", "PLAYING"));
        ObjectProvider<GameService> provider = mock(ObjectProvider.class);
        when(provider.getObject()).thenReturn(game);
        var chat = mock(ChatService.class);
        when(chat.history(anyLong(), eq(7L))).thenReturn(List.of());
        var message = Map.<String, Object>of("id", 1L, "matchId", 10L, "content", "laugh", "type", "STICKER");
        when(chat.post(10, 7, "STICKER", "laugh")).thenReturn(message);
        var socket = new GameSocket(auth, json, provider, chat);
        var sender = connect(socket, "sender", 10);
        var peer = connect(socket, "peer", 10);
        var other = connect(socket, "other", 20);

        receive(socket, sender, "CHAT_SEND", Map.of("matchId", 10, "messageType", "STICKER", "content", "laugh"));
        verify(sender).sendMessage(argThat(msg -> msg.getPayload().toString().contains("CHAT_MESSAGE")));
        verify(peer).sendMessage(argThat(msg -> msg.getPayload().toString().contains("CHAT_MESSAGE")));
        verify(other, never()).sendMessage(any());

        clearInvocations(sender, peer, chat);
        receive(socket, sender, "CHAT_SEND", Map.of("matchId", 20, "messageType", "TEXT", "content", "wrong room"));
        verify(chat, never()).post(anyLong(), anyLong(), anyString(), anyString());
        verify(sender).sendMessage(argThat(msg -> msg.getPayload().toString().contains("CHAT_ERROR")));
        verify(peer, never()).sendMessage(any());
    }
}
