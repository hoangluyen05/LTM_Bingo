
package com.bingo.arena;

import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final Auth auth;

    public AuthController(Auth auth) {
        this.auth = auth;
    }

    // Đăng ký chỉ cần username và password
    record Register(
        String username,
        String password
    ) {}

    // Đăng nhập
    record Login(
        String username,
        String password
    ) {}

    @PostMapping("/register")
    public Map<String, String> register(
            @RequestBody Register request) {

        auth.register(
            request.username(),
            request.password()
        );

        return Map.of(
            "message", "Đăng ký thành công!"
        );
    }

    @PostMapping("/login")
    public Map<String, Object> login(
            @RequestBody Login request) {

        return auth.login(
            request.username(),
            request.password()
        );
    }
}
