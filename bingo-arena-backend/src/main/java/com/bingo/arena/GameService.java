package com.bingo.arena;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.*;

@Service
public class GameService {
    private final JdbcTemplate db;
    private final Auth auth;
    private final ObjectMapper json;
    private final GameSocket socket;

    public GameService(JdbcTemplate db, Auth auth, ObjectMapper json, GameSocket socket) {
        this.db = db;
        this.auth = auth;
        this.json = json;
        this.socket = socket;
    }

    private ApiError err(HttpStatus status, String code, String message) {
        return new ApiError(status, code, message);
    }

    private Map<String, Object> one(String sql, Object... args) {
        var rows = db.queryForList(sql, args);
        if (rows.isEmpty())
            throw err(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy dữ liệu.");
        return rows.get(0);
    }

    private long num(Object o) {
        return ((Number) o).longValue();
    }

    private String str(Object o) {
        return o == null ? null : o.toString();
    }

    private Map<String, Object> player(long id) {
        var u = auth.user(id);
        return Map.of("id", u.get("id"), "displayName", u.get("displayName"));
    }

    private void afterCommit(Runnable run) {
        if (TransactionSynchronizationManager.isSynchronizationActive())
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    run.run();
                }
            });
        else
            run.run();
    }

    private Map<String, Object> roomRow(String code) {
        return one("SELECT * FROM rooms WHERE room_code=?", code.toUpperCase(Locale.ROOT));
    }

    private void member(Map<String, Object> room, long uid) {
        if (num(room.get("host_user_id")) != uid
                && (room.get("guest_user_id") == null || num(room.get("guest_user_id")) != uid))
            throw err(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không thuộc phòng này.");
    }

    public Map<String, Object> roomView(Map<String, Object> room) {
        long id = num(room.get("id"));
        var m = new LinkedHashMap<String, Object>();
        m.put("id", id);
        m.put("roomCode", room.get("room_code"));
        m.put("status", room.get("status"));
        m.put("host", player(num(room.get("host_user_id"))));
        m.put("guest", room.get("guest_user_id") == null ? null : player(num(room.get("guest_user_id"))));
        m.put("createdAt", str(room.get("created_at")));
        var matches = db.queryForList("SELECT id FROM matches WHERE room_id=? ORDER BY id DESC LIMIT 1", id);
        if (!matches.isEmpty())
            m.put("matchId", num(matches.get(0).get("id")));
        return m;
    }

    private void publishRoom(String code) {
        afterCommit(() -> socket.publishRoom(code));
    }

    @Transactional
    public Map<String, Object> create(long uid) {
        if (!db.queryForList(
                "SELECT id FROM rooms WHERE status IN ('WAITING','PLAYING') AND (host_user_id=? OR guest_user_id=?)",
                uid, uid).isEmpty())
            throw err(HttpStatus.CONFLICT, "ROOM_ALREADY_EXISTS", "Bạn đã có phòng đang hoạt động.");
        for (int i = 0; i < 20; i++) {
            String code = "BG-" + (1000 + new java.security.SecureRandom().nextInt(9000));
            try {
                db.update("INSERT INTO rooms(room_code,host_user_id) VALUES(?,?)", code, uid);
                return roomView(roomRow(code));
            } catch (org.springframework.dao.DuplicateKeyException ignored) {
            }
        }
        throw err(HttpStatus.SERVICE_UNAVAILABLE, "ROOM_CODE_EXHAUSTED", "Không tạo được mã phòng.");
    }

    @Transactional
    public Map<String, Object> join(String code, long uid) {
        var r = roomRow(code);
        if (!"WAITING".equals(r.get("status")))
            throw err(HttpStatus.CONFLICT, "ROOM_UNAVAILABLE", "Phòng đã bắt đầu.");
        if (num(r.get("host_user_id")) == uid)
            throw err(HttpStatus.CONFLICT, "ROOM_OWNER", "Bạn là chủ phòng.");
        if (r.get("guest_user_id") != null && num(r.get("guest_user_id")) != uid)
            throw err(HttpStatus.CONFLICT, "ROOM_FULL", "Phòng đã đủ hai người.");
        if (!db.queryForList(
                "SELECT id FROM rooms WHERE id<>? AND status IN ('WAITING','PLAYING') AND (host_user_id=? OR guest_user_id=?)",
                r.get("id"), uid, uid).isEmpty())
            throw err(HttpStatus.CONFLICT, "ALREADY_IN_ROOM", "Bạn đang ở phòng khác.");
        int n = db.update(
                "UPDATE rooms SET guest_user_id=? WHERE id=? AND status='WAITING' AND (guest_user_id IS NULL OR guest_user_id=?)",
                uid, r.get("id"), uid);
        if (n == 0)
            throw err(HttpStatus.CONFLICT, "ROOM_FULL", "Phòng đã đủ người.");
        publishRoom(code);
        return roomView(roomRow(code));
    }

    public Map<String, Object> getRoom(String code, long uid) {
        var r = roomRow(code);
        member(r, uid);
        return roomView(r);
    }

    // Called by the explicit leave button and by logout/home navigation.
    // Lock the room row so two concurrent leave requests cannot overwrite the result.
    @Transactional
    public void leave(String code, long uid) {
        var rows = db.queryForList(
                "SELECT * FROM rooms WHERE room_code=? FOR UPDATE",
                code.toUpperCase(Locale.ROOT));
        if (rows.isEmpty())
            throw err(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy phòng.");
        var r = rows.get(0);
        member(r, uid);
        String status = str(r.get("status"));
        if ("CLOSED".equals(status)) return;

        long roomId = num(r.get("id"));
        String roomCode = str(r.get("room_code"));
        if ("PLAYING".equals(status)) {
            var matches = db.queryForList(
                    "SELECT id FROM matches WHERE room_id=? AND status IN ('PREPARING','PLAYING') ORDER BY id DESC LIMIT 1",
                    roomId);
            if (!matches.isEmpty()) {
                long mid = num(matches.get(0).get("id"));
                long host = num(r.get("host_user_id"));
                long guest = num(r.get("guest_user_id"));
                long winner = uid == host ? guest : host;
                int changed = db.update(
                        "UPDATE matches SET status='FINISHED', winner_user_id=?, " +
                        "current_turn_user_id=NULL, ended_at=NOW() " +
                        "WHERE id=? AND status IN ('PREPARING','PLAYING')",
                        winner, mid);
                if (changed == 1) {
                    db.update("UPDATE match_players SET result=CASE " +
                            "WHEN user_id=? THEN 'WIN' ELSE 'LOSE' END WHERE match_id=?",
                            winner, mid);
                    afterCommit(() -> socket.publishFinished(mid));
                }
            }
            db.update("UPDATE rooms SET status='CLOSED',closed_at=NOW() WHERE id=?", roomId);
            publishRoom(roomCode);
            afterCommit(() -> socket.publishRoomClosed(roomCode));
        } else if ("WAITING".equals(status)) {
            if (num(r.get("host_user_id")) == uid) {
                db.update("UPDATE rooms SET status='CLOSED',closed_at=NOW() WHERE id=?", roomId);
                publishRoom(roomCode);
                afterCommit(() -> socket.publishRoomClosed(roomCode));
            } else {
                db.update("UPDATE rooms SET guest_user_id=NULL WHERE id=?", roomId);
                publishRoom(roomCode);
            }
        }
    }

    // Also works when the frontend has lost its cached room code.
    @Transactional
    public void leaveCurrent(long uid) {
        var rows = db.queryForList(
                "SELECT room_code FROM rooms WHERE status IN ('WAITING','PLAYING') " +
                "AND (host_user_id=? OR guest_user_id=?) ORDER BY id", uid, uid);
        for (var row : rows) leave(str(row.get("room_code")), uid);
    }

    @Transactional
    public Map<String, Object> start(String code, long uid) {
        var r = roomRow(code);
        if (num(r.get("host_user_id")) != uid)
            throw err(HttpStatus.FORBIDDEN, "FORBIDDEN", "Chỉ chủ phòng được bắt đầu.");
        if (!"WAITING".equals(r.get("status")) || r.get("guest_user_id") == null)
            throw err(HttpStatus.CONFLICT, "ROOM_NOT_READY", "Cần đủ hai người trong phòng chờ.");
        long rid = num(r.get("id"));
        int n = db.update(
                "UPDATE rooms SET status='PLAYING' WHERE id=? AND status='WAITING' AND guest_user_id IS NOT NULL", rid);
        if (n == 0)
            throw err(HttpStatus.CONFLICT, "ROOM_NOT_READY", "Phòng không sẵn sàng.");
        db.update("INSERT INTO matches(room_id,status,current_turn_user_id,preparation_ends_at_ms) " +
                "VALUES(?,'PREPARING',?,?)", rid, uid, System.currentTimeMillis() + 10_000L);
        long mid = num(one("SELECT id FROM matches WHERE room_id=? ORDER BY id DESC LIMIT 1", rid).get("id"));
        try {
            db.update("INSERT INTO match_players(match_id,user_id,board_json) VALUES(?,?,?)", mid, uid,
                    json.writeValueAsString(BingoRules.board()));
            db.update("INSERT INTO match_players(match_id,user_id,board_json) VALUES(?,?,?)", mid,
                    r.get("guest_user_id"), json.writeValueAsString(BingoRules.board()));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
        publishRoom(code);
        afterCommit(() -> socket.publishGameStarted(code, mid));
        return roomView(roomRow(code));
    }

    private Map<String, Object> matchRow(long id) {
        return one(
                "SELECT m.*,r.room_code,r.host_user_id,r.guest_user_id FROM matches m JOIN rooms r ON m.room_id=r.id WHERE m.id=?",
                id);
    }

    private void matchMember(Map<String, Object> m, long uid) {
        if (num(m.get("host_user_id")) != uid && num(m.get("guest_user_id")) != uid)
            throw err(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không thuộc trận đấu.");
    }

    private List<List<Integer>> parseBoard(Object board) {
        try {
            return json.readValue(str(board), new TypeReference<List<List<Integer>>>() {
            });
        } catch (Exception e) {
            throw new IllegalStateException("Board JSON invalid", e);
        }
    }

    public Map<String, Object> matchView(long id, long uid) {
        var m = matchRow(id);
        matchMember(m, uid);
        var called = db.queryForList("SELECT called_number FROM called_numbers WHERE match_id=? ORDER BY turn_no", id)
                .stream().map(r -> ((Number) r.get("called_number")).intValue()).toList();
        var players = new ArrayList<Map<String, Object>>();
        Object myBoard = null;
        for (var row : db.queryForList("SELECT * FROM match_players WHERE match_id=? ORDER BY id", id)) {
            long pid = num(row.get("user_id"));
            var p = new LinkedHashMap<>(player(pid));
            p.put("bingoLines", num(row.get("bingo_lines")));
            p.put("markedCount", num(row.get("marked_count")));
            players.add(p);
            if (pid == uid)
                myBoard = parseBoard(row.get("board_json"));
        }
        var last = db.queryForList(
                "SELECT called_number,called_by_user_id FROM called_numbers WHERE match_id=? ORDER BY turn_no DESC LIMIT 1",
                id);
        var view = new LinkedHashMap<String, Object>();
        view.put("id", id);
        view.put("roomCode", m.get("room_code"));
        view.put("status", m.get("status"));
        view.put("players", players);
        view.put("myBoard", myBoard);
        view.put("calledNumbers", called);
        view.put("currentTurnUserId", m.get("current_turn_user_id"));
        view.put("winnerUserId", m.get("winner_user_id"));
        view.put("lastCalledNumber", last.isEmpty() ? null : last.get(0).get("called_number"));
        view.put("lastCalledByUserId", last.isEmpty() ? null : last.get(0).get("called_by_user_id"));
        view.put("preparationEndsAtMs", m.get("preparation_ends_at_ms"));
        view.put("serverNowMs", System.currentTimeMillis());
        view.put("startedAt", str(m.get("started_at")));
        view.put("endedAt", str(m.get("ended_at")));
        return view;
    }

    // Đổi vị trí hai ô trên bảng của chính người chơi, chỉ trong 10 giây chuẩn bị.
    // Khóa bản ghi match để serialize thao tác swap và thời điểm bắt đầu.
    @Transactional
    public Map<String, Object> swapBoard(long mid, long uid, int from, int to) {
        var m = one("SELECT m.*,r.host_user_id,r.guest_user_id FROM matches m " +
                "JOIN rooms r ON r.id=m.room_id WHERE m.id=? FOR UPDATE", mid);
        matchMember(m, uid);
        if (!"PREPARING".equals(str(m.get("status"))) ||
                System.currentTimeMillis() >= num(m.get("preparation_ends_at_ms")))
            throw err(HttpStatus.CONFLICT, "PREPARATION_ENDED", "Đã hết thời gian sắp xếp bảng.");
        if (from < 0 || from >= 25 || to < 0 || to >= 25)
            throw err(HttpStatus.BAD_REQUEST, "INVALID_POSITION", "Vị trí phải nằm trong khoảng 0 đến 24.");
        var row = one("SELECT board_json FROM match_players WHERE match_id=? AND user_id=?", mid, uid);
        var board = parseBoard(row.get("board_json"));
        int a = board.get(from / 5).get(from % 5);
        int b = board.get(to / 5).get(to % 5);
        board.get(from / 5).set(from % 5, b);
        board.get(to / 5).set(to % 5, a);
        try {
            db.update("UPDATE match_players SET board_json=? WHERE match_id=? AND user_id=?",
                    json.writeValueAsString(board), mid, uid);
        } catch (Exception e) { throw new IllegalStateException(e); }
        afterCommit(() -> socket.publishMatch(mid));
        return matchView(mid, uid);
    }

    // Scheduler chạy trên server, không phụ thuộc client có đang mở trang hay không.
    @org.springframework.scheduling.annotation.Scheduled(fixedDelay = 250)
    @Transactional
    public void activatePreparedMatches() {
        long now = System.currentTimeMillis();
        var rows = db.queryForList("SELECT id FROM matches WHERE status='PREPARING' " +
                "AND preparation_ends_at_ms<=?", now);
        for (var row : rows) {
            long mid = num(row.get("id"));
            int changed = db.update("UPDATE matches SET status='PLAYING' " +
                    "WHERE id=? AND status='PREPARING' AND preparation_ends_at_ms<=?", mid, now);
            if (changed == 1) afterCommit(() -> socket.publishMatch(mid));
        }
    }

    @Transactional
    public void call(long mid, long uid, int number) {
        var m = one("SELECT m.*,r.room_code,r.host_user_id,r.guest_user_id FROM matches m " +
                "JOIN rooms r ON r.id=m.room_id WHERE m.id=? FOR UPDATE", mid);
        matchMember(m, uid);
        if (!"PLAYING".equals(m.get("status")))
            throw err(HttpStatus.CONFLICT, "MATCH_FINISHED", "Trận đấu đã kết thúc.");
        if (num(m.get("current_turn_user_id")) != uid)
            throw err(HttpStatus.CONFLICT, "NOT_YOUR_TURN", "Chưa đến lượt của bạn.");
        if (number < 1 || number > 25)
            throw err(HttpStatus.BAD_REQUEST, "INVALID_NUMBER", "Số phải từ 1 đến 25.");
        var called = new LinkedHashSet<Integer>();
        for (var row : db.queryForList("SELECT called_number FROM called_numbers WHERE match_id=? ORDER BY turn_no",
                mid))
            called.add(((Number) row.get("called_number")).intValue());
        if (!called.add(number))
            throw err(HttpStatus.CONFLICT, "NUMBER_ALREADY_CALLED", "Số đã được gọi.");
        db.update("INSERT INTO called_numbers(match_id,turn_no,called_number,called_by_user_id) VALUES(?,?,?,?)", mid,
                called.size(), number, uid);
        long host = num(m.get("host_user_id")), guest = num(m.get("guest_user_id"));
        var scores = new HashMap<Long, Integer>();
        for (var row : db.queryForList("SELECT user_id,board_json FROM match_players WHERE match_id=?", mid)) {
            long pid = num(row.get("user_id"));
            int lines = BingoRules.lines(parseBoard(row.get("board_json")), called);
            scores.put(pid, lines);
            db.update("UPDATE match_players SET bingo_lines=?,marked_count=? WHERE match_id=? AND user_id=?", lines,
                    called.size(), mid, pid);
        }
        boolean h = scores.get(host) >= 5, g = scores.get(guest) >= 5;
        if (h || g) {
            long winner = h && g ? uid : h ? host : guest;
            db.update(
                    "UPDATE matches SET status='FINISHED',winner_user_id=?,current_turn_user_id=NULL,ended_at=NOW() WHERE id=?",
                    winner, mid);
            db.update("UPDATE match_players SET result=CASE WHEN user_id=? THEN 'WIN' ELSE 'LOSE' END WHERE match_id=?",
                    winner, mid);
            db.update("UPDATE rooms SET status='CLOSED',closed_at=NOW() WHERE id=?", m.get("room_id"));
            afterCommit(() -> socket.publishFinished(mid));
            publishRoom(str(m.get("room_code")));
        } else {
            db.update("UPDATE matches SET current_turn_user_id=? WHERE id=?", uid == host ? guest : host, mid);
            afterCommit(() -> socket.publishMatch(mid));
        }
    }

    public List<Map<String, Object>> history(long uid) {
        var rows = db.queryForList(
                "SELECT m.id matchId,CASE WHEN r.host_user_id=? THEN ug.display_name ELSE uh.display_name END opponentName,mp.result,m.started_at startedAt,m.ended_at endedAt FROM matches m JOIN rooms r ON r.id=m.room_id JOIN users uh ON uh.id=r.host_user_id JOIN users ug ON ug.id=r.guest_user_id JOIN match_players mp ON mp.match_id=m.id AND mp.user_id=? WHERE m.status='FINISHED' ORDER BY m.ended_at DESC",
                uid, uid);
        var out = new ArrayList<Map<String, Object>>();
        for (var r : rows)
            out.add(Map.of("matchId", r.get("matchId"), "opponentName", r.get("opponentName"), "result",
                    r.get("result"), "startedAt", str(r.get("startedAt")), "endedAt", str(r.get("endedAt"))));
        return out;
    }
}