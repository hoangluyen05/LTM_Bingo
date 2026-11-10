const WS_URL = import.meta.env.VITE_WS_URL || `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/game`;
export function subscribeRoom(roomCode, { onRoom, onStarted, onClosed, onStatus, onError } = {}) {
  const token = sessionStorage.getItem("bingo_access_token");
  if (!token) { onError?.("Vui lòng đăng nhập lại."); onStatus?.("disconnected"); return () => {}; }
  onStatus?.("connecting");
  const socket = new WebSocket(WS_URL);
  let disposed = false;
  socket.onopen = () => socket.send(JSON.stringify({ type: "AUTH", payload: { token } }));
  socket.onmessage = (event) => {
    if (disposed) return;
    let message;
    try { message = JSON.parse(event.data); } catch { onError?.("Dữ liệu WebSocket không hợp lệ."); return; }
    const { type, payload = {} } = message;
    if (type === "AUTH_OK") {
      socket.send(JSON.stringify({ type: "SUBSCRIBE_ROOM", payload: { roomCode } }));
      onStatus?.("connected");
    } else if (type === "ROOM_UPDATED") {
      onRoom?.(payload.room || payload);
    } else if (type === "GAME_STARTED") {
      onStarted?.(payload);
    } else if (type === "ROOM_CLOSED") {
      onClosed?.();
    } else if (type === "ERROR" || type === "AUTH_ERROR") {
      onError?.(payload.message || "Server xử lý thất bại.");
      if (type === "AUTH_ERROR") socket.close();
    }
  };
  socket.onerror = () => { if (!disposed) onError?.("Không thể kết nối WebSocket."); };
  socket.onclose = () => { if (!disposed) onStatus?.("disconnected"); };
  return () => { disposed = true; socket.close(); };
}
