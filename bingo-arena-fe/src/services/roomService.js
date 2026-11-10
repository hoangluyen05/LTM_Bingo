import { apiRequest } from "./api";
const ROOM_KEY = "bingo_current_room";
export function getCachedRoom() {
  try {
    const room = JSON.parse(sessionStorage.getItem(ROOM_KEY) || "null");
    const user = JSON.parse(sessionStorage.getItem("bingo_user") || "null");
    if (!room || !user) return null;
    return room.host?.id === user.id || room.guest?.id === user.id ? room : null;
  } catch { return null; }
}
export function clearCachedRoom() { sessionStorage.removeItem(ROOM_KEY); }
export function cacheRoom(room) { sessionStorage.setItem(ROOM_KEY, JSON.stringify(room)); }
export async function createRoom() {
  const room = await apiRequest("/rooms", { method: "POST" });
  cacheRoom(room); return room;
}
export async function joinRoom(roomCode) {
  const code = String(roomCode || "").trim().toUpperCase();
  if (!/^BG-[0-9]{4}$/.test(code)) throw new Error("Mã phòng phải có dạng BG-1234.");
  const room = await apiRequest(`/rooms/${encodeURIComponent(code)}/join`, { method: "POST" });
  cacheRoom(room); return room;
}
export async function getRoomState(roomCode) {
  const code = String(roomCode || "").trim().toUpperCase();
  const room = await apiRequest(`/rooms/${encodeURIComponent(code)}`);
  cacheRoom(room); return room;
}
export async function startGame(roomCode) {
  const code = String(roomCode || "").trim().toUpperCase();
  const room = await apiRequest(`/rooms/${encodeURIComponent(code)}/start`, { method: "POST" });
  cacheRoom(room); return room;
}
export async function leaveRoom(roomCode) {
  const code = String(roomCode || "").trim().toUpperCase();
  await apiRequest(`/rooms/${encodeURIComponent(code)}/leave`, { method: "POST" });
  clearCachedRoom();
}
