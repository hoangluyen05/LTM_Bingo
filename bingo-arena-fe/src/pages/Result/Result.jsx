
import { useEffect, useState } from "react";
import {
    useLocation,
    useNavigate,
    useParams,
} from "react-router";

import {
    getCachedRoom,
    clearCachedRoom,
} from "../../services/roomService";

import { getGameState } from "../../services/gameService";

import "./Result.css";

export default function Result() {
    const navigate = useNavigate();
    const location = useLocation();
    const { code } = useParams();

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

    const won =
        game.winnerUserId === user?.id;

    const me = game.players.find(
        (player) => player.id === user?.id
    );

    const opponent = game.players.find(
        (player) => player.id !== user?.id
    );

    return (
        <div className="result-container">
            <div className="result-box">
                <div className="result-trophy">
                    {won ? "🏆" : "🎮"}
                </div>

                <h1
                    className={
                        won
                            ? "result-win"
                            : "result-lose"
                    }
                >
                    {won
                        ? "BẠN ĐÃ CHIẾN THẮNG!"
                        : "BẠN ĐÃ THUA!"}
                </h1>

                <p className="result-subtitle">
                    Trận đấu Bingo 1vs1 đã kết thúc
                </p>

                <div className="result-winner">
                    Người chiến thắng:{" "}
                    <strong>
                        {
                            game.players.find(
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
