package com.bingo.arena;
import org.springframework.http.HttpStatus;
public class ApiError extends RuntimeException {
 public final HttpStatus status; public final String code;
 public ApiError(HttpStatus status,String code,String message){super(message);this.status=status;this.code=code;}
}
/**$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()

$env:BINGO_TOKEN_SECRET = [Convert]::ToBase64String($bytes)

.\mvnw.cmd spring-boot:run */