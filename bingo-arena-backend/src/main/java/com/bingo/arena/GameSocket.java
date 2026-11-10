package com.bingo.arena;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class GameSocket extends TextWebSocketHandler {
    private final Auth auth;
    private final ObjectMapper json;
    private final org.springframework.beans.factory.ObjectProvider<GameService> gameProvider;
    private final Map<String, Client> clients = new ConcurrentHashMap<>();

    record Client(WebSocketSession session, long uid, String room, Long match) {
    }

    public GameSocket(Auth auth, ObjectMapper json,
            org.springframework.beans.factory.ObjectProvider<GameService> gameProvider) {
        this.auth = auth;
        this.json = json;
        this.gameProvider = gameProvider;
    }

    private GameService game() {
        return gameProvider.getObject();
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession s) {
        clients.put(s.getId(), new Client(s, 0, null, null));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession s, CloseStatus status) {
        clients.remove(s.getId());
    }

    private void send(WebSocketSession s, String type, Object payload) {
        try {
            if (s.isOpen()) {
                s.sendMessage(new TextMessage(json.writeValueAsString(Map.of("type", type, "payload", payload))));
            }
        } catch (Exception ignored) {
        }
    }

    private void error(WebSocketSession s, String type, String message) {
        send(s, type, Map.of("message", message));
    }

    @Override
    protected void handleTextMessage(WebSocketSession s, TextMessage msg) {
        try {
            JsonNode m = json.readTree(msg.getPayload());
            String type = m.path("type").asText();
            JsonNode p = m.path("payload");
            Client c = clients.get(s.getId());
            if (c == null)
                return;
            if ("AUTH".equals(type)) {
                long uid = auth.verify(p.path("token").asText());
                clients.put(s.getId(), new Client(s, uid, null, null));
                send(s, "AUTH_OK", Map.of("userId", uid));
                return;
            }
            if (c.uid() == 0)
                throw new ApiError(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Bạn chưa xác thực.");
            switch (type) {
                case "SUBSCRIBE_ROOM" -> {
                    String code = p.path("roomCode").asText().toUpperCase(Locale.ROOT);
                    var room = game().getRoom(code, c.uid());
                    clients.put(s.getId(), new Client(s, c.uid(), code, null));
                    send(s, "ROOM_UPDATED", Map.of("room", room));
                }
                case "SUBSCRIBE_MATCH" -> {
                    long mid = p.path("matchId").asLong();
                    var state = game().matchView(mid, c.uid());
                    clients.put(s.getId(), new Client(s, c.uid(), null, mid));
                    send(s, "MATCH_STATE", Map.of("state", state));
                }
                case "CALL_NUMBER" -> {
                    long mid = p.path("matchId").asLong();
                    if (c.match() == null || c.match() != mid)
                        throw new ApiError(HttpStatus.FORBIDDEN, "FORBIDDEN", "Chưa theo dõi trận này.");
                    game().call(mid, c.uid(), p.path("number").asInt(-1));
                }
                default -> error(s, "ERROR", "Loại thông điệp không hợp lệ.");
            }
        } catch (ApiError e) {
            error(s, "ERROR", e.getMessage());
        } catch (Exception e) {
            error(s, "ERROR", "Thông điệp không hợp lệ hoặc xử lý thất bại.");
        }
    }

    public void publishRoom(String code) {
        for (Client c : clients.values())
            if (code.equalsIgnoreCase(c.room()))
                try {
                    send(c.session(), "ROOM_UPDATED", Map.of("room", game().getRoom(code, c.uid())));
                } catch (Exception ignored) {
                }
    }

    public void publishRoomClosed(String code) {
        for (Client c : clients.values())
            if (code.equalsIgnoreCase(c.room()))
                send(c.session(), "ROOM_CLOSED", Map.of("roomCode", code));
    }

    public void publishGameStarted(String code, long mid) {
        for (Client c : clients.values())
            if (code.equalsIgnoreCase(c.room()))
                send(c.session(), "GAME_STARTED", Map.of("roomCode", code, "matchId", mid));
    }

    public void publishMatch(long mid) {
        for (Client c : clients.values())
            if (c.match() != null && c.match() == mid)
                try {
                    send(c.session(), "MATCH_STATE", Map.of("state", game().matchView(mid, c.uid())));
                } catch (Exception ignored) {
                }
    }

    public void publishFinished(long mid) {
        for (Client c : clients.values())
            if (c.match() != null && c.match() == mid)
                try {
                    send(c.session(), "GAME_FINISHED", Map.of("state", game().matchView(mid, c.uid())));
                } catch (Exception ignored) {
                }
    }
}
