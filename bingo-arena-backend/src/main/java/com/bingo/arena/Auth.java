
package com.bingo.arena;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;

@Service
public class Auth {

    private final JdbcTemplate db;
    private final ObjectMapper json;
    private final byte[] secret;

    private final BCryptPasswordEncoder bcrypt =
            new BCryptPasswordEncoder();

    public Auth(
            JdbcTemplate db,
            ObjectMapper json,
            @Value("${app.token-secret}") String secret) {

        this.db = db;
        this.json = json;
        this.secret = secret.getBytes(
                StandardCharsets.UTF_8
        );
    }

    // Lấy thông tin người dùng
    public Map<String, Object> user(long id) {

        return db.query(
            "SELECT id, username, display_name " +
            "FROM users WHERE id = ?",
            rs -> {
                if (!rs.next()) {
                    throw new ApiError(
                        HttpStatus.UNAUTHORIZED,
                        "UNAUTHORIZED",
                        "Tài khoản không tồn tại."
                    );
                }

                return Map.of(
                    "id", rs.getLong("id"),
                    "username", rs.getString("username"),
                    "displayName",
                    rs.getString("display_name")
                );
            },
            id
        );
    }

    // Đăng ký tài khoản
    public void register(
            String username,
            String password) {

        if (username == null ||
                !username.matches("[a-zA-Z0-9_]{3,50}") ||
                password == null ||
                password.length() < 6 ||
                password.length() > 72) {

            throw new ApiError(
                HttpStatus.BAD_REQUEST,
                "INVALID_INPUT",
                "Thông tin đăng ký không hợp lệ."
            );
        }

        // Kiểm tra username đã tồn tại
        boolean exists = !db.queryForList(
            "SELECT id FROM users " +
            "WHERE LOWER(username) = LOWER(?)",
            username
        ).isEmpty();

        if (exists) {
            throw new ApiError(
                HttpStatus.CONFLICT,
                "USERNAME_EXISTS",
                "Tên đăng nhập đã tồn tại."
            );
        }

        // Mã hóa mật khẩu
        String passwordHash = bcrypt.encode(password);

        // Không nhận displayName từ frontend.
        // Tự động sử dụng username làm display_name.
        try {
            db.update(
                "INSERT INTO users " +
                "(username, password_hash, display_name) " +
                "VALUES (?, ?, ?)",
                username,
                passwordHash,
                username
            );
        } catch (DuplicateKeyException e) {
            throw new ApiError(
                HttpStatus.CONFLICT,
                "USERNAME_EXISTS",
                "Tên đăng nhập đã tồn tại."
            );
        }
    }

    // Đăng nhập
    public Map<String, Object> login(
            String username,
            String password) {

        var rows = db.queryForList(
            "SELECT id, password_hash " +
            "FROM users " +
            "WHERE LOWER(username) = LOWER(?)",
            username == null ? "" : username
        );

        if (rows.isEmpty() ||
                password == null ||
                !bcrypt.matches(
                    password,
                    (String) rows.get(0).get("password_hash")
                )) {

            throw new ApiError(
                HttpStatus.UNAUTHORIZED,
                "INVALID_CREDENTIALS",
                "Tên đăng nhập hoặc mật khẩu không đúng."
            );
        }

        long id = ((Number) rows.get(0).get("id"))
                .longValue();

        return Map.of(
            "accessToken", token(id),
            "user", user(id)
        );
    }

    // Tạo chữ ký HMAC-SHA256
    private byte[] sign(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");

            mac.init(
                new SecretKeySpec(
                    secret,
                    "HmacSHA256"
                )
            );

            return mac.doFinal(
                data.getBytes(StandardCharsets.UTF_8)
            );

        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    // Tạo token có hiệu lực 24 giờ
    public String token(long id) {
        try {
            String data = Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(
                    json.writeValueAsBytes(
                        Map.of(
                            "uid", id,
                            "exp",
                            Instant.now()
                                .plusSeconds(86400)
                                .getEpochSecond()
                        )
                    )
                );

            String signature = Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(sign(data));

            return data + "." + signature;

        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    // Xác thực token
    public long verify(String token) {
        try {
            String[] parts = token.split("\\.");

            if (parts.length != 2) {
                throw new IllegalArgumentException();
            }

            byte[] expected = sign(parts[0]);

            byte[] actual = Base64.getUrlDecoder()
                    .decode(parts[1]);

            if (!MessageDigest.isEqual(
                    expected, actual)) {
                throw new IllegalArgumentException();
            }

            var node = json.readTree(
                Base64.getUrlDecoder().decode(parts[0])
            );

            if (node.path("exp").asLong() <=
                    Instant.now().getEpochSecond()) {
                throw new IllegalArgumentException();
            }

            long id = node.path("uid").asLong();

            user(id);

            return id;

        } catch (Exception e) {
            throw new ApiError(
                HttpStatus.UNAUTHORIZED,
                "UNAUTHORIZED",
                "Token không hợp lệ hoặc đã hết hạn."
            );
        }
    }

    // Lấy user ID từ Authorization Header
    public long requestUser(String header) {

        if (header == null ||
                !header.startsWith("Bearer ")) {

            throw new ApiError(
                HttpStatus.UNAUTHORIZED,
                "UNAUTHORIZED",
                "Thiếu Bearer token."
            );
        }

        return verify(header.substring(7));
    }
}
