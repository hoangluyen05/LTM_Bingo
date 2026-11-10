# Bingo Arena Backend (Java Spring Boot + MySQL + WebSocket)

Backend dành cho frontend `bingo-arena-fe.zip`, luật 5×5, số 1–25, người chơi thay phiên gọi số. Người đầu tiên đạt **ít nhất 5 đường Bingo** thắng. Nếu cùng đạt 5 đường trong một lượt, người vừa gọi số được ưu tiên. Hai bảng riêng, server giữ quyền kiểm tra kết quả.

## Yêu cầu
Java 21, MySQL 8 hoặc Docker Compose. Đã kèm `mvnw.cmd` để tự tải Maven 3.9.9 lần đầu (cần Internet).

## Cách chạy không Docker
1. Import file `LTM.sql` để tạo database `bingo_online` và 5 bảng.
2. Thiết lập biến môi trường `DB_URL`, `DB_USER`, `DB_PASSWORD`, `TOKEN_SECRET` (>=32 ký tự), `ALLOWED_ORIGINS` (danh sách origin FE, ngăn cách dấu phẩy).
3. Chạy `.\mvnw.cmd clean spring-boot:run` trong PowerShell. Schema không tự tạo; phải import `LTM.sql` trước.
4. Chạy frontend với `.env`: `VITE_USE_MOCK=false`, `VITE_API_BASE_URL=http://IP_MAY_SERVER:8080/api`, `VITE_WS_URL=ws://IP_MAY_SERVER:8080/ws/game`.
5. Chạy `npm run dev -- --host 0.0.0.0` trên máy chứa FE; máy thứ hai truy cập `http://IP_MAY_SERVER:5173`. Thêm `http://IP_MAY_SERVER:5173` vào `ALLOWED_ORIGINS` và mở firewall cổng 5173/8080.

## Cách chạy Docker
`docker compose up --build -d`. Sửa `MYSQL_ROOT_PASSWORD`, `TOKEN_SECRET`, `ALLOWED_ORIGINS` trước khi dùng. Không cần Docker để hai máy cùng LAN chơi được.

## REST API (Bearer token ngoại trừ auth)
| Method | Endpoint | Công dụng |
|---|---|---|
| POST | /api/auth/register | `{username,password,displayName}` |
| POST | /api/auth/login | `{username,password}` -> `{accessToken,user}` |
| POST | /api/rooms | Tạo phòng |
| POST | /api/rooms/{code}/join | Tham gia |
| GET | /api/rooms/{code} | Lấy trạng thái phòng |
| POST | /api/rooms/{code}/leave | Rời phòng |
| POST | /api/rooms/{code}/start | Chủ phòng bắt đầu |
| GET | /api/matches/{id} | Trạng thái trận của người gọi |
| GET | /api/matches/history | Lịch sử thắng/thua |

## WebSocket thuần tại `/ws/game`
Client gửi JSON `{ "type": "AUTH", "payload": { "token": "..." } }` -> `AUTH_OK`.
- Phòng: `SUBSCRIBE_ROOM` + `{roomCode}` -> `ROOM_UPDATED` + `{room}`, `GAME_STARTED` + `{roomCode,matchId}`, `ROOM_CLOSED`.
- Trận: `SUBSCRIBE_MATCH` + `{matchId}` -> `MATCH_STATE` + `{state}`.
- Gọi số: `CALL_NUMBER` + `{matchId,number}` -> server gửi `MATCH_STATE` cho cả hai; khi thắng gửi `GAME_FINISHED` + `{state}`.
- Lỗi: `ERROR` + `{message}`. Chỉ gửi bảng của chính người đăng nhập; người khác không xem được bảng của đối thủ.

## Quy tắc / giới hạn
- Schema bám theo 5 bảng tài liệu: users, rooms, matches, match_players, called_numbers.
- Không cho người thứ ba vào phòng; không gọi sai lượt/trùng số/ngoài 1–25.
- Người chơi rời phòng khi đang chơi: trận `ABANDONED`, phòng `CLOSED`. Mất mạng đột ngột không tự hủy trận; có thể kết nối lại.
- Dùng token HMAC SHA-256 tự triển khai gọn để khớp FE; production nên thay bằng Spring Security/JWT chuẩn và HTTPS/WSS.
- Bản demo dành cho **một instance Spring Boot**. WebSocket session nằm trong RAM, không hỗ trợ scale nhiều replica.
- Cần kiểm thử tích hợp thực tế với FE và hai máy; không mặc định là đã chạy thành công ở môi trường của bạn.

## Test
`.\mvnw.cmd test` (kiểm tra thuật toán tạo bảng và đếm đường Bingo).
