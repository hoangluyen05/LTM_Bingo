import { apiRequest } from "./api";
export function getGameState(matchId) { return apiRequest(`/matches/${encodeURIComponent(matchId)}`); }
export function getMatchHistory() { return apiRequest("/matches/history"); }
