package com.bingo.arena;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.sql.Statement;
import java.util.*;

@Service
public class ChatService {
    private static final Set<String> STICKERS = Set.of("laugh", "celebrate", "cry", "angry", "surprised", "cool");
    private final JdbcTemplate db;

    public ChatService(JdbcTemplate db) { this.db = db; }

    private String authorize(long mid, long uid, boolean sending) {
        var rows = db.queryForList("SELECT m.status FROM matches m JOIN rooms r ON r.id=m.room_id " +
                "WHERE m.id=? AND (r.host_user_id=? OR r.guest_user_id=?)", mid, uid, uid);
        if (rows.isEmpty()) throw new ApiError(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không thuộc trận đấu này.");
        String status = rows.get(0).get("status").toString();
        if (sending && !Set.of("PREPARING", "PLAYING").contains(status))
            throw new ApiError(HttpStatus.CONFLICT, "CHAT_CLOSED", "Trận đấu đã kết thúc.");
        return status;
    }

    static String validateContent(String type, String content) {
        String value = content == null ? "" : content.strip();
        if ("TEXT".equals(type)) {
            if (value.isBlank() || value.length() > 500)
                throw new ApiError(HttpStatus.BAD_REQUEST, "INVALID_CHAT", "Tin nhắn phải từ 1 đến 500 ký tự.");
        } else if ("STICKER".equals(type)) {
            if (!STICKERS.contains(value))
                throw new ApiError(HttpStatus.BAD_REQUEST, "INVALID_STICKER", "Sticker không hợp lệ.");
        } else throw new ApiError(HttpStatus.BAD_REQUEST, "INVALID_CHAT", "Loại tin nhắn không hợp lệ.");
        return value;
    }

    private static final String MESSAGE_QUERY = "SELECT c.id,c.match_id AS matchId,c.user_id AS userId," +
            "u.display_name AS displayName,c.message_type AS type,c.content,c.created_at_ms AS createdAtMs " +
            "FROM chat_messages c JOIN users u ON u.id=c.user_id ";

    public List<Map<String, Object>> history(long mid, long uid) {
        authorize(mid, uid, false);
        var rows = db.queryForList(MESSAGE_QUERY + "WHERE c.match_id=? ORDER BY c.id DESC LIMIT 100", mid);
        Collections.reverse(rows);
        return rows;
    }

    @Transactional
    public Map<String, Object> post(long mid, long uid, String type, String content) {
        String value = validateContent(type, content);
        // Serialize each sender, including multiple browser tabs, for the rate limit.
        db.queryForList("SELECT id FROM users WHERE id=? FOR UPDATE", uid);
        authorize(mid, uid, true);
        long now = System.currentTimeMillis();
        Integer recent = db.queryForObject("SELECT COUNT(*) FROM chat_messages WHERE match_id=? " +
                "AND user_id=? AND created_at_ms>?", Integer.class, mid, uid, now - 2000);
        if (recent != null && recent >= 3)
            throw new ApiError(HttpStatus.TOO_MANY_REQUESTS, "CHAT_RATE_LIMIT", "Bạn gửi hơi nhanh. Hãy chờ một chút nhé.");
        var key = new GeneratedKeyHolder();
        db.update(connection -> {
            var statement = connection.prepareStatement("INSERT INTO chat_messages" +
                    "(match_id,user_id,message_type,content,created_at_ms) VALUES(?,?,?,?,?)", Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, mid);
            statement.setLong(2, uid);
            statement.setString(3, type);
            statement.setString(4, value);
            statement.setLong(5, now);
            return statement;
        }, key);
        return db.queryForMap(MESSAGE_QUERY + "WHERE c.id=?", Objects.requireNonNull(key.getKey()).longValue());
    }
}
