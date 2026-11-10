
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import {
    getCachedRoom,
    getRoomState,
    cacheRoom,
    startGame,
    leaveRoom,
    clearCachedRoom,
} from "../../services/roomService";

import { subscribeRoom } from "../../services/roomRealtime";

import "./WaitingRoom.css";

export default function WaitingRoom() {
    const { code } = useParams();
    const navigate = useNavigate();

    const [room, setRoom] = useState(getCachedRoom);
    const [loadingRoom, setLoadingRoom] = useState(true);
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [connection, setConnection] = useState("connecting");
    const [retry, setRetry] = useState(0);

    const user = JSON.parse(
        sessionStorage.getItem("bingo_user") || "null"
    );

    const isHost = room?.host?.id === user?.id;
    const hasTwoPlayers = Boolean(room?.guest);
    const isClosed = room?.status === "CLOSED";

    const canStart =
        isHost &&
        hasTwoPlayers &&
        room?.status === "WAITING" &&
        ["connected", "mock"].includes(connection) &&
        !busy;

    // Lấy dữ liệu phòng và lắng nghe thay đổi thời gian thực
    useEffect(() => {
        let active = true;
        let navigated = false;

        function goToGame(data) {
            if (!active || navigated) return;

            navigated = true;

            navigate(`/game/${code}`, {
                replace: true,
                state: { matchId: data?.matchId },
            });
        }

        const unsubscribe = subscribeRoom(code, {
            onStatus: (status) => {
                if (active) setConnection(status);
            },

            onRoom: (updatedRoom) => {
                if (!active || updatedRoom?.roomCode !== code) {
                    return;
                }

                setRoom(updatedRoom);
                cacheRoom(updatedRoom);

                if (updatedRoom.status === "CLOSED") {
                    setError("Phòng đã bị đóng.");
                }

                if (updatedRoom.status === "PLAYING") {
                    goToGame(updatedRoom);
                }
            },

            onStarted: (data) => {
                goToGame(data);
            },

            onClosed: () => {
                if (!active) return;

                setRoom((previous) =>
                    previous
                        ? { ...previous, status: "CLOSED" }
                        : previous
                );

                setError("Chủ phòng đã đóng phòng.");
            },

            onError: (message) => {
                if (active) setError(message);
            },
        });

        async function loadRoom() {
            setLoadingRoom(true);
            setError("");

            try {
                const freshRoom = await getRoomState(code);

                if (!active) return;

                setRoom(freshRoom);

                if (freshRoom.status === "PLAYING") {
                    goToGame(freshRoom);
                }

                if (freshRoom.status === "CLOSED") {
                    setError("Phòng đã bị đóng.");
                }
            } catch (err) {
                if (active) {
                    setError(err.message || "Không tải được phòng.");
                }
            } finally {
                if (active) setLoadingRoom(false);
            }
        }

        loadRoom();

        return () => {
            active = false;
            unsubscribe();
        };
    }, [code, navigate, retry]);

    // Chủ phòng bắt đầu trận
    async function handleStart() {
        if (!canStart) return;

        setBusy("start");
        setError("");

        try {
            const startedRoom = await startGame(code);

            setRoom(startedRoom);

            navigate(`/game/${code}`, {
                replace: true,
                state: { matchId: startedRoom.matchId },
            });
        } catch (err) {
            setError(err.message || "Không thể bắt đầu trận.");
        } finally {
            setBusy("");
        }
    }

    // Rời phòng
    async function handleLeave() {
        if (busy) return;

        const confirmed = window.confirm(
            "Bạn có chắc chắn muốn rời phòng không?"
        );

        if (!confirmed) return;

        setBusy("leave");
        setError("");

        try {
            await leaveRoom(code);
            navigate("/", { replace: true });
        } catch (err) {
            setError(err.message || "Không thể rời phòng.");
        } finally {
            setBusy("");
        }
    }

    // Sao chép mã phòng
    async function handleCopyCode() {
        try {
            await navigator.clipboard.writeText(code);
            setNotice("Đã sao chép mã phòng!");
        } catch {
            setNotice("Không thể sao chép. Mã phòng: " + code);
        }
    }

    function handleReturnHome() {
        clearCachedRoom();
        navigate("/", { replace: true });
    }

    function playerStatus(player) {
        if (!player) return "Đang chờ người chơi";
        if (player.connected === true) return "Trực tuyến";
        if (player.connected === false) return "Mất kết nối";
        return "Đã tham gia";
    }

    if (loadingRoom) {
        return (
            <div className="waiting-room-container">
                <div className="waiting-room-box">
                    <h2>Đang tải thông tin phòng...</h2>
                </div>
            </div>
        );
    }

    if (!room || room.roomCode !== code) {
        return (
            <div className="waiting-room-container">
                <div className="waiting-room-box">
                    <h2>Không thể mở phòng</h2>

                    <p className="waiting-room-error">
                        {error || "Không tìm thấy thông tin phòng."}
                    </p>

                    <button
                        className="waiting-room-start"
                        onClick={() => setRetry((n) => n + 1)}
                    >
                        THỬ LẠI
                    </button>

                    <button
                        className="waiting-room-leave"
                        onClick={handleReturnHome}
                    >
                        VỀ TRANG CHỦ
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="waiting-room-container">
            <div className="waiting-room-box">
                <h1>PHÒNG CHỜ</h1>
                <p className="waiting-room-subtitle">
                    Bingo Online 1vs1
                </p>

                {/* Mã phòng */}
                <div className="waiting-room-code-box">
                    <span>MÃ PHÒNG</span>
                    <h2>{room.roomCode}</h2>

                    <button
                        className="waiting-room-copy"
                        onClick={handleCopyCode}
                    >
                        Sao chép mã
                    </button>
                </div>

                {notice && (
                    <p className="waiting-room-success" role="status">
                        {notice}
                    </p>
                )}

                {/* Trạng thái kết nối */}
                <div className="waiting-room-connection">
                    <span>Trạng thái kết nối:</span>

                    <strong>
                        {connection === "mock"
                            ? "Chế độ Demo"
                            : connection === "connected"
                                ? "Đã kết nối"
                                : connection === "connecting"
                                    ? "Đang kết nối..."
                                    : "Mất kết nối"}
                    </strong>
                </div>

                {/* Danh sách người chơi */}
                <div className="waiting-room-players">
                    <div className="waiting-room-player">
                        <div className="waiting-room-avatar">P1</div>

                        <h3>{room.host?.displayName}</h3>

                        <span className="waiting-room-role">
                            CHỦ PHÒNG
                        </span>

                        <p>{playerStatus(room.host)}</p>
                    </div>

                    <div className="waiting-room-player">
                        <div className="waiting-room-avatar">P2</div>

                        <h3>
                            {room.guest?.displayName || "Đang chờ..."}
                        </h3>

                        <span className="waiting-room-role guest">
                            NGƯỜI THAM GIA
                        </span>

                        <p>{playerStatus(room.guest)}</p>
                    </div>
                </div>

                {error && (
                    <div className="waiting-room-error" role="alert">
                        {error}
                    </div>
                )}

                {connection === "disconnected" && !isClosed && (
                    <button
                        className="waiting-room-retry"
                        onClick={() => setRetry((n) => n + 1)}
                    >
                        THỬ KẾT NỐI LẠI
                    </button>
                )}

                {!isClosed && (
                    <>
                        {/* Chỉ chủ phòng thấy nút bắt đầu */}
                        {isHost ? (
                            <>
                                {!hasTwoPlayers && (
                                    <p className="waiting-room-note">
                                        Đang chờ người chơi thứ hai...
                                    </p>
                                )}

                                <button
                                    className="waiting-room-start"
                                    onClick={handleStart}
                                    disabled={!canStart}
                                >
                                    {busy === "start"
                                        ? "ĐANG BẮT ĐẦU..."
                                        : "BẮT ĐẦU TRẬN ĐẤU"}
                                </button>
                            </>
                        ) : (
                            <p className="waiting-room-note">
                                Đang chờ chủ phòng bắt đầu trận đấu...
                            </p>
                        )}

                        <button
                            className="waiting-room-leave"
                            onClick={handleLeave}
                            disabled={Boolean(busy)}
                        >
                            {busy === "leave"
                                ? "ĐANG RỜI PHÒNG..."
                                : "RỜI PHÒNG"}
                        </button>
                    </>
                )}

                {isClosed && (
                    <button
                        className="waiting-room-leave"
                        onClick={handleReturnHome}
                    >
                        VỀ TRANG CHỦ
                    </button>
                )}
            </div>
        </div>
    );
}
