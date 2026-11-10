import { getGameState } from "./gameService";
const WS_URL = import.meta.env.VITE_WS_URL || `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/game`;
export function subscribeGame(matchId, { onState, onStatus, onError } = {}) {
  const token = sessionStorage.getItem("bingo_access_token");
  if (!token) {
    onError?.("Vui lòng đăng nhập lại."); onStatus?.("disconnected");
    return { sendNumber: async () => { throw new Error("Vui lòng đăng nhập lại."); }, unsubscribe: () => {} };
  }
  onStatus?.("connecting");
  const socket = new WebSocket(WS_URL);
  let disposed = false, subscribed = false;
  socket.onopen = () => socket.send(JSON.stringify({ type: "AUTH", payload: { token } }));
  socket.onmessage = async (event) => {
    if (disposed) return;
    let message;
    try { message = JSON.parse(event.data); } catch { onError?.("Dữ liệu WebSocket không hợp lệ."); return; }
    const { type, payload = {} } = message;
    if (type === "AUTH_OK") {
      socket.send(JSON.stringify({ type: "SUBSCRIBE_MATCH", payload: { matchId: Number(matchId) } }));
    } else if (type === "MATCH_STATE") {
      subscribed = true; onStatus?.("connected"); onState?.(payload.state || payload);
    } else if (type === "GAME_FINISHED") {
      if (payload.state) onState?.(payload.state);
      else try { onState?.(await getGameState(matchId)); } catch (e) { onError?.(e.message); }
    } else if (type === "ERROR" || type === "AUTH_ERROR") {
      onError?.(payload.message || "Server xử lý thất bại.");
      if (type === "AUTH_ERROR") socket.close();
    }
  };
  socket.onerror = () => { if (!disposed) onError?.("Không thể kết nối WebSocket."); };
  socket.onclose = () => { subscribed = false; if (!disposed) onStatus?.("disconnected"); };
  return {
    sendNumber: async (number) => {
      if (socket.readyState !== WebSocket.OPEN || !subscribed) throw new Error("Chưa kết nối trận đấu.");
      socket.send(JSON.stringify({ type: "CALL_NUMBER", payload: { matchId: Number(matchId), number } }));
      return null;
    },
    unsubscribe: () => { disposed = true; socket.close(); },
  };
}
