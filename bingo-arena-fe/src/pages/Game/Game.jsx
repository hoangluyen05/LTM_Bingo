
import { useEffect, useRef, useState } from "react";
import {
    useLocation,
    useNavigate,
    useParams,
} from "react-router";

import BingoBoard from "../../components/BingoBoard/BingoBoard";

import {
    getCachedRoom,
    getRoomState,
    leaveCurrentRoom,
} from "../../services/roomService";

import { getGameState, swapBoardPositions } from "../../services/gameService";
import { subscribeGame } from "../../services/gameRealtime";

import "./Game.css";

export default function Game() {
    const { code } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const transportRef = useRef(null);
    const swapQueueRef = useRef(Promise.resolve());
    const pendingSwapsRef = useRef(0);
    const gameRef = useRef(null);
    const [nowMs, setNowMs] = useState(Date.now());
    const [clockOffset, setClockOffset] = useState(0);
    const [savingBoard, setSavingBoard] = useState(false);

    const [game, setGame] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [connection, setConnection] = useState("connecting");
    const [retry, setRetry] = useState(0);
    const [leaving, setLeaving] = useState(false);

    const user = JSON.parse(
        sessionStorage.getItem("bingo_user") || "null"
    );

    const routeMatchId = location.state?.matchId;

    // Nhận và cập nhật trạng thái trận
    useEffect(() => {
        let active = true;
        let transport = null;

        function applyState(state) {
            if (!active) return;

            gameRef.current = state;
            setGame(state);
            if (Number.isFinite(Number(state.serverNowMs))) {
                setClockOffset(Number(state.serverNowMs) - Date.now());
            }
            setBusy(false);
            setError("");

            if (state.status === "FINISHED") {
                navigate(`/result/${code}`, {
                    replace: true,
                    state: { matchId: state.id },
                });
            }
        }

        async function initializeGame() {
            setLoading(true);
            setError("");
            setConnection("connecting");

            try {
                let matchId = routeMatchId;

                // Tìm matchId trong phòng hiện tại
                if (!matchId) {
                    let room = getCachedRoom();

                    if (
                        !room ||
                        room.roomCode !== code ||
                        !room.matchId
                    ) {
                        room = await getRoomState(code);
                    }

                    matchId = room?.matchId;
                }

                if (!matchId) {
                    throw new Error(
                        "Không tìm thấy trận đấu. Hãy vào lại phòng."
                    );
                }

                const initialState =
                    await getGameState(matchId);

                if (!active) return;

                applyState(initialState);
                setLoading(false);

                if (initialState.status !== "PLAYING" && initialState.status !== "PREPARING") {
                    return;
                }

                transport = subscribeGame(matchId, {
                    onState: applyState,

                    onStatus: (status) => {
                        if (!active) return;

                        setConnection(status);

                        if (status === "disconnected") {
                            setBusy(false);
                        }
                    },

                    onError: (message) => {
                        if (!active) return;

                        setBusy(false);
                        setError(message);
                    },
                });

                transportRef.current = transport;
            } catch (err) {
                if (!active) return;

                setError(
                    err.message || "Không thể tải trận đấu."
                );
                setLoading(false);
                setConnection("disconnected");
            }
        }

        initializeGame();

        return () => {
            active = false;

            transport?.unsubscribe();

            if (transportRef.current === transport) {
                transportRef.current = null;
            }
        };
    }, [code, routeMatchId, navigate, retry]);

    useEffect(() => {
        if (game?.status !== "PREPARING") return;
        const timer = window.setInterval(() => setNowMs(Date.now()), 100);
        return () => window.clearInterval(timer);
    }, [game?.status]);

    // Gửi tuần tự các lần hoán đổi để không bị ghi đè sai thứ tự.
    function handleSwap(from, to) {
        const current = gameRef.current;
        if (!current || current.status !== "PREPARING" ||
            Date.now() + clockOffset >= Number(current.preparationEndsAtMs)) return;
        if (from === to || pendingSwapsRef.current > 0) return;
        pendingSwapsRef.current++;
        setSavingBoard(true);
        setError("");
        swapQueueRef.current = swapQueueRef.current
            .catch(() => {})
            .then(async () => {
                try {
                    const updated = await swapBoardPositions(current.id, from, to);
                    gameRef.current = updated;
                    setGame(updated);
                } catch (err) {
                    setError(err.message || "Không lưu được vị trí số.");
                    try {
                        const fresh = await getGameState(current.id);
                        gameRef.current = fresh;
                        setGame(fresh);
                    } catch { /* giữ thông báo lỗi chính */ }
                } finally {
                    pendingSwapsRef.current--;
                    setSavingBoard(pendingSwapsRef.current > 0);
                }
            });
    }

    // Người chơi chọn số trên bảng
    async function handleSelectNumber(number) {
        if (!game || busy) return;

        if (game.status !== "PLAYING") return;

        if (game.currentTurnUserId !== user?.id) {
            setError("Chưa đến lượt của bạn!");
            return;
        }

        if (game.calledNumbers.includes(number)) {
            setError("Số này đã được gọi!");
            return;
        }

        setBusy(true);
        setError("");

        try {
            if (!transportRef.current) {
                throw new Error(
                    "Chưa thiết lập kết nối trận đấu."
                );
            }

            const updatedState =
                await transportRef.current.sendNumber(number);

            // Mock trả dữ liệu ngay.
            // WebSocket thật trả null, đợi Server gửi MATCH_STATE.
            if (updatedState) {
                setGame(updatedState);
                setBusy(false);

                if (updatedState.status === "FINISHED") {
                    navigate(`/result/${code}`, {
                        replace: true,
                        state: { matchId: updatedState.id },
                    });
                }
            }
        } catch (err) {
            setBusy(false);
            setError(
                err.message || "Không thể gọi số."
            );
        }
    }

    // Rời trận: người rời bị xử thua
    async function handleLeaveGame() {
        if (leaving || busy) return;

        const confirmed = window.confirm(
            "Rời trận sẽ bị xử thua. Bạn chắc chắn muốn về trang chủ?"
        );

        if (!confirmed) return;

        setLeaving(true);
        setError("");

        try {
            await leaveCurrentRoom();

            transportRef.current?.unsubscribe();
            transportRef.current = null;

            navigate("/", { replace: true });
        } catch (err) {
            setError(
                err.message ||
                "Không thể rời trận. Hãy thử lại."
            );
        } finally {
            setLeaving(false);
        }
    }

    if (loading) {
        return (
            <div className="game-container">
                <div className="game-box">
                    <h2>Đang tải trận đấu...</h2>
                </div>
            </div>
        );
    }

    if (!game) {
        return (
            <div className="game-container">
                <div className="game-box">
                    <h2>Không thể mở trận đấu</h2>

                    <p className="game-error">{error}</p>

                    <button
                        className="game-retry-button"
                        onClick={() =>
                            setRetry((value) => value + 1)
                        }
                    >
                        THỬ LẠI
                    </button>

                    <button
                        className="game-back-button"
                        onClick={handleLeaveGame}
                    >
                        VỀ TRANG CHỦ
                    </button>
                </div>
            </div>
        );
    }

    const me = game.players.find(
        (player) => player.id === user?.id
    );

    const opponent = game.players.find(
        (player) => player.id !== user?.id
    );

    const myTurn =
        game.currentTurnUserId === user?.id;

    const connected =
        connection === "connected" ||
        connection === "mock";

    const preparing = game.status === "PREPARING";
    const remainingMs = preparing
        ? Math.max(0, Number(game.preparationEndsAtMs) - (nowMs + clockOffset))
        : 0;
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    const canArrange = preparing && remainingMs > 0 && !savingBoard && !leaving;

    const canPlay =
        game.status === "PLAYING" &&
        myTurn &&
        connected &&
        !busy &&
        !leaving;

    return (
        <div className="game-container">
            <div className="game-box">

                {/* HEADER */}
                <div className="game-header">
                    <h1>BINGO ARENA</h1>
                    <span>Phòng: {game.roomCode}</span>
                </div>

                <button
                    type="button"
                    className="game-back-button"
                    onClick={handleLeaveGame}
                    disabled={leaving || busy}
                >
                    {leaving
                        ? "ĐANG RỜI TRẬN..."
                        : "RỜI TRẬN / VỀ TRANG CHỦ"}
                </button>

                {error && (
                    <p className="game-error" role="alert">
                        {error}
                    </p>
                )}

                {preparing && (
                    <div className="game-preparation" role="status">
                        <strong>CHUẨN BỊ TRẬN ĐẤU — {remainingSeconds}s</strong>
                        <span>{remainingMs > 0
                            ? "Kéo thả các ô số để tự sắp xếp bảng trước khi bắt đầu"
                            : "Hết thời gian — đang chờ máy chủ bắt đầu trận..."}</span>
                    </div>
                )}

                {/* CHIA BỐ CỤC TRÁI - PHẢI */}
                <div className="game-layout">

                    {/* BÊN TRÁI */}
                    <section className="game-left">
                        <h2 className="game-board-title">
                            BẢNG BINGO CỦA BẠN
                        </h2>

                        <div className="game-board-area">
                            <BingoBoard
                                board={game.myBoard}
                                calledNumbers={game.calledNumbers}
                                canPlay={canPlay}
                                canArrange={canArrange}
                                onSwap={handleSwap}
                                onSelect={handleSelectNumber}
                            />
                        </div>

                        <p className="game-instruction">
                            {preparing
                                ? (savingBoard ? "Đang lưu vị trí các số..." : "Sắp xếp bảng trong 10 giây chuẩn bị")
                                : myTurn
                                    ? "Chọn một số chưa được gọi trên bảng"
                                    : "Đang chờ đối thủ chọn số..."}
                        </p>
                    </section>

                    {/* BÊN PHẢI */}
                    <aside className="game-right">

                        {/* THÔNG TIN NGƯỜI CHƠI */}
                        <div className="game-players">
                            <div className="game-player">
                                <h3>
                                    {me?.displayName || "Bạn"}
                                </h3>
                                <span>BẠN</span>

                                <strong>
                                    {me?.bingoLines ?? 0}/5
                                </strong>

                                <p>Đường Bingo</p>
                            </div>

                            <div className="game-player">
                                <h3>
                                    {opponent?.displayName ||
                                        "Đối thủ"}
                                </h3>

                                <span>ĐỐI THỦ</span>

                                <strong>
                                    {opponent?.bingoLines ?? 0}/5
                                </strong>

                                <p>Đường Bingo</p>
                            </div>
                        </div>

                        {/* TRẠNG THÁI LƯỢT */}
                        <div
                            className={
                                myTurn
                                    ? "game-turn my-turn"
                                    : "game-turn opponent-turn"
                            }
                        >
                            {preparing
                                ? "ĐANG CHUẨN BỊ — CHƯA ĐƯỢC GỌI SỐ"
                                : myTurn
                                    ? "ĐANG ĐẾN LƯỢT CỦA BẠN"
                                    : "ĐANG ĐẾN LƯỢT ĐỐI THỦ"}
                        </div>

                        {/* TRẠNG THÁI KẾT NỐI */}
                        <div className="game-connection">
                            <span>
                                Kết nối:{" "}
                                {connection === "mock"
                                    ? "Chế độ Demo"
                                    : connection === "connected"
                                        ? "Đã kết nối"
                                        : connection === "connecting"
                                            ? "Đang kết nối..."
                                            : "Mất kết nối"}
                            </span>
                        </div>

                        {/* THÔNG BÁO LỖI */}
                        {error && (
                            <div
                                className="game-error"
                                role="alert"
                            >
                                {error}
                            </div>
                        )}

                        {!connected && (
                            <button
                                className="game-retry-button"
                                onClick={() =>
                                    setRetry((value) => value + 1)
                                }
                            >
                                KẾT NỐI LẠI
                            </button>
                        )}

                        {/* SỐ VỪA GỌI */}
                        <div className="game-last-number">
                            <p>SỐ VỪA ĐƯỢC GỌI</p>

                            <strong>
                                {game.lastCalledNumber ?? "--"}
                            </strong>
                        </div>

                        {/* TRẠNG THÁI GỬI */}
                        {busy && (
                            <p className="game-processing">
                                Đang gửi số đến Server...
                            </p>
                        )}

                        {/* DANH SÁCH SỐ */}
                        <div className="game-called-section">
                            <h3>
                                DANH SÁCH SỐ ĐÃ GỌI{" "}
                                ({game.calledNumbers.length}/25)
                            </h3>

                            <div className="game-called-list">
                                {game.calledNumbers.length === 0 ? (
                                    <p className="game-no-numbers">
                                        Chưa có số nào được gọi.
                                    </p>
                                ) : (
                                    game.calledNumbers.map(
                                        (number) => (
                                            <span
                                                className="game-called-number"
                                                key={number}
                                            >
                                                {number}
                                            </span>
                                        )
                                    )
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
