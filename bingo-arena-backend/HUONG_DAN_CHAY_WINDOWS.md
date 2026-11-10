# Hướng dẫn chạy Bingo Backend trên Windows (không cần cài Maven)

## 1. Chuẩn bị
- Java 21: `java -version`
- MySQL 8 đang chạy. Import file `LTM.sql` vào MySQL trước khi khởi động.
- Internet khi chạy lần đầu để script tải Apache Maven 3.9.9 và dependencies.

## 2. Thiết lập MySQL trong PowerShell
```powershell
cd D:\LTM\BTL\bingo-arena-backend
$env:DB_URL = 'jdbc:mysql://localhost:3306/bingo_online?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Ho_Chi_Minh'
$env:DB_USER = 'root'
$env:DB_PASSWORD = 'MAT_KHAU_MYSQL_CUA_BAN'
$env:TOKEN_SECRET = 'local-bingo-secret-change-me-1234567890'
```
Thay `MAT_KHAU_MYSQL_CUA_BAN` bằng mật khẩu MySQL thực tế. Nếu root không có mật khẩu, dùng `$env:DB_PASSWORD = ''`.

## 3. Chạy
```powershell
.\mvnw.cmd -version
.\mvnw.cmd clean spring-boot:run
```
Lưu ý: `mvnw.cmd` là script bootstrap tự tải Maven, không phải bản Maven Wrapper chính thức dùng wrapper JAR. Không cần `mvn` trong PATH.

## 4. Chạy frontend React
Sửa file `.env` của frontend:
```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080/ws/game
```
Chạy `npm install`, sau đó `npm run dev`.

## 5. Chơi qua 2 máy cùng Wi-Fi
Thay `localhost` trong `.env` frontend bằng IPv4 của máy chạy backend; mở Windows Firewall TCP 8080 và 5173, và cấu hình `$env:ALLOWED_ORIGINS = 'http://localhost:5173,http://IP_MAY_CHU:5173'` trước khi chạy backend. Chạy frontend `npm run dev -- --host 0.0.0.0`.

## 6. Nếu gặp lỗi
- `Access denied for user`: kiểm tra DB_USER/DB_PASSWORD.
- `Unknown database`: import `LTM.sql`.
- `Connection refused`: kiểm tra MySQL đã bật.
- `Cannot download Maven`: kiểm tra Internet hoặc tải Maven thủ công.
- Port 8080 bị chiếm: dừng ứng dụng đang dùng cổng hoặc đổi SERVER_PORT.

Chưa có xác nhận biên dịch/tích hợp thực tế trên máy Windows của bạn. Gửi log terminal nếu phát sinh lỗi.
