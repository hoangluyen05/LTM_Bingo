import { apiRequest } from "./api";

export function getGameState(matchId) {
    return apiRequest(`/matches/${encodeURIComponent(matchId)}`);
}

export function getMatchHistory() {
    return apiRequest("/matches/history");
}

export function swapBoardPositions(matchId, from, to) {
    return apiRequest(`/matches/${encodeURIComponent(matchId)}/board/swap`, {
        method: "POST",
        body: { from, to },
    });
}
