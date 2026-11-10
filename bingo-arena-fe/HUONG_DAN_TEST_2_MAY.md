# Bingo Arena — Frontend gọi Backend thật, chơi trên 2 máy (Windows)

## Chuẩn bị
- Máy A: Java 21, MySQL, Spring Boot backend và Node.js. Máy B: chỉ cần Chrome/Edge.
- Backend `bingo-arena-backend-complete` đang chạy cổng 8080 trên **máy A**, MySQL `bingo_online` hoạt động.
- Frontend này dùng API thật, không dùng mock. Mọi request `/api` và `/ws` được Vite trên máy A chuyển tới backend `127.0.0.1:8080`.
- Giao diện JSX/CSS giữ nguyên. Không phải sửa URL API khi truy cập từ máy B. Proxy WebSocket chuyển Origin về backend host; chỉ sử dụng trên mạng LAN tin cậy.

## 1. Chạy trên máy A
```powershell
cd D:\LTM\BTL\bingo-arena-fe
npm install
npm run dev
```
Mở http://localhost:5173 trên máy A. Vite phải hiện `Local` và `Network`.

## 2. Kiểm tra frontend / backend
- Đăng ký tài khoản 1 (nếu chưa có), đăng nhập, tạo phòng (mã `BG-xxxx`).
- Đăng ký tài khoản 2 trên máy B, đăng nhập, nhập mã phòng và tham gia.
- Chủ phòng nhấn Bắt đầu; cả hai máy vào màn hình Game. Thay phiên chọn số 1–25, trạng thái được cập nhật qua WebSocket.
- Nếu đã dùng `player1`, `player2` trong Postman thì chỉ cần đăng nhập, không đăng ký lại.

## 3. Lấy IP LAN của máy A
Trên máy A, mở PowerShell:
```powershell
ipconfig
```
Tìm `IPv4 Address` của adapter Wi-Fi, ví dụ `192.168.1.10` (đây chỉ là ví dụ).
Máy B mở `http://192.168.1.10:5173` (thay bằng IP thật của máy A).
**Không dùng `localhost:5173` trên máy B** vì localhost là chính máy B.

## 4. Windows Firewall
Cho phép kết nối TCP **5173 inbound** trên máy A, trong mạng Private. Mở PowerShell với quyền Administrator:
```powershell
New-NetFirewallRule -DisplayName "Bingo Vite LAN 5173" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173 -Profile Private
```
Backend 8080 không cần mở trực tiếp cho máy B vì trình duyệt gọi thông qua proxy 5173 trên máy A.
Chỉ chạy trên Wi-Fi tin cậy, không port-forward ra Internet.

## 5. Kiểm tra lỗi
- Máy B không vào được URL: kiểm tra hai máy cùng Wi-Fi, IP máy A, Windows Firewall, Wi-Fi client isolation (guest network), và Vite đang chạy.
- UI hiện `Không thể kết nối Backend`: kiểm tra Backend cổng 8080 và Vite proxy trên máy A.
- Login lỗi 401: kiểm tra username/password, token, hoặc đăng nhập lại.
- Không tự chuyển phòng chờ / lượt gọi số không cập nhật: mở DevTools > Network > WS > `/ws/game` xem WebSocket 101; đảm bảo dùng bản backend có `/ws/game`.
- Mỗi máy dùng một tài khoản khác nhau; dùng cùng tài khoản sẽ không thể tự tham gia phòng.
- Sau khi thay đổi `.env` hoặc `vite.config.js`, khởi động lại `npm run dev`.

## API sử dụng
- `POST /api/auth/register`, `POST /api/auth/login`
- `POST /api/rooms`, `POST /api/rooms/:code/join`, `GET /api/rooms/:code`, `POST /api/rooms/:code/start`, `POST /api/rooms/:code/leave`
- `GET /api/matches/:id`, `GET /api/matches/history`
- WebSocket `/ws/game`: AUTH, SUBSCRIBE_ROOM, GAME_STARTED, SUBSCRIBE_MATCH, CALL_NUMBER, MATCH_STATE, GAME_FINISHED.

## Lưu ý
Bản frontend được kiểm tra build tĩnh. Chưa thể chạy end-to-end với MySQL và hai máy thật trong môi trường tạo file; hãy thực hiện các bước test trên máy A/B.
