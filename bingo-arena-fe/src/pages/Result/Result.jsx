
import { useEffect, useState } from "react";
import {
    useLocation,
    useNavigate,
} from "react-router";

import {
    getCachedRoom,
    clearCachedRoom,
} from "../../services/roomService";

import { getGameState } from "../../services/gameService";

import "./Result.css";
import ResultScene from "./ResultScene";

export default function Result() {
    const navigate = useNavigate();
    const location = useLocation();

    const [game, setGame] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    const user = JSON.parse(
        sessionStorage.getItem("bingo_user") || "null"
    );

    const routeMatchId = location.state?.matchId;

    useEffect(() => {
        let active = true;

        async function loadResult() {
            try {
                const room = getCachedRoom();

                const matchId =
                    routeMatchId || room?.matchId;

                if (!matchId) {
                    throw new Error(
                        "Không tìm thấy mã trận đấu."
                    );
                }

                const result =
                    await getGameState(matchId);

                if (!active) return;

                if (result.status !== "FINISHED") {
                    throw new Error(
                        "Trận đấu chưa kết thúc."
                    );
                }

                setGame(result);
            } catch (err) {
                if (active) {
                    setError(err.message);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadResult();

        return () => {
            active = false;
        };
    }, [routeMatchId]);

    // Trở về trang chủ và xóa thông tin phòng cũ
    function goHome() {
        clearCachedRoom();

        navigate("/", {
            replace: true,
        });
    }

    if (loading) {
        return (
            <div className="result-container">
                <div className="result-box">
                    <p>Đang tải kết quả...</p>
                </div>
            </div>
        );
    }

    if (!game) {
        return (
            <div className="result-container">
                <div className="result-box">
                    <p className="result-error">
                        {error}
                    </p>

                    <button
                        className="result-home-button"
                        onClick={goHome}
                    >
                        VỀ TRANG CHỦ
                    </button>
                </div>
            </div>
        );
    }

    const draw = game.result === "DRAW" || game.winnerUserId == null ||
        (game.players.length === 2 && game.players.every(player => Number(player.bingoLines) >= 5));
    const won = !draw && game.winnerUserId === user?.id;
    const outcome = draw ? "draw" : won ? "win" : "lose";

    const me = game.players.find(
        (player) => player.id === user?.id
    );

    const opponent = game.players.find(
        (player) => player.id !== user?.id
    );

    return (
        <div className={`result-container result-theme-${outcome}`}>
            <ResultScene outcome={outcome} />
            <div className="result-box" role="region" aria-label="Kết quả trận đấu">
                <span className="result-scene-label">{draw ? "MỘT NGÀY ĐẸP TRỜI" : won ? "KHOẢNH KHẮC TỎA SÁNG" : "SAU CƠN MƯA, TRỜI LẠI SÁNG"}</span>
                <div className="result-trophy">
                    {draw ? "🤝" : won ? "🏆" : "🎮"}
                </div>

                <h1
                    className={
                        draw ? "result-draw" : won
                            ? "result-win"
                            : "result-lose"
                    }
                >
                    {draw ? "TRẬN ĐẤU HÒA!" : won
                        ? "BẠN ĐÃ CHIẾN THẮNG!"
                        : "BẠN ĐÃ THUA!"}
                </h1>

                <p className="result-subtitle">
                    {draw ? "Cả hai cùng đạt đủ 5 đường Bingo trong một lượt gọi!" : "Trận đấu Bingo 1vs1 đã kết thúc"}
                </p>

                <div className="result-winner">
                    {draw ? "Kết quả: " : "Người chiến thắng: "}
                    <strong>
                        {
                            draw ? "HÒA — Chúc mừng cả hai người chơi!" : game.players.find(
                                (player) =>
                                    player.id ===
                                    game.winnerUserId
                            )?.displayName
                        }
                    </strong>
                </div>

                <div className="result-players">
                    <div className="result-player">
                        <h3>
                            {me?.displayName}
                        </h3>

                        <p>Bạn</p>

                        <strong>
                            {me?.bingoLines}/5
                        </strong>

                        <span>Đường Bingo</span>
                    </div>

                    <div className="result-player">
                        <h3>
                            {opponent?.displayName}
                        </h3>

                        <p>Đối thủ</p>

                        <strong>
                            {opponent?.bingoLines}/5
                        </strong>

                        <span>Đường Bingo</span>
                    </div>
                </div>

                <p className="result-info">
                    Tổng số lượt gọi:{" "}
                    {game.calledNumbers.length}
                </p>

                <button
                    className="result-home-button"
                    onClick={goHome}
                >
                    VỀ TRANG CHỦ
                </button>
            </div>
        </div>
    );
}
