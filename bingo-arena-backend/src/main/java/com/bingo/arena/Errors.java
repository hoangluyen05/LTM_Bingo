package com.bingo.arena;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestControllerAdvice
public class Errors {
    @ExceptionHandler(ApiError.class)
    public ResponseEntity<?> handle(ApiError e) {
        return ResponseEntity.status(e.status).body(Map.of("code", e.code, "message", e.getMessage()));
    }

    @ExceptionHandler({ org.springframework.web.bind.MethodArgumentNotValidException.class,
            org.springframework.http.converter.HttpMessageNotReadableException.class })
    public ResponseEntity<?> invalid(Exception e) {
        return ResponseEntity.badRequest()
                .body(Map.of("code", "INVALID_REQUEST", "message", "Dữ liệu yêu cầu không hợp lệ."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> unexpected(Exception e) {
        return ResponseEntity.internalServerError().body(Map.of("code", "INTERNAL_ERROR", "message", "Lỗi máy chủ."));
    }
}
