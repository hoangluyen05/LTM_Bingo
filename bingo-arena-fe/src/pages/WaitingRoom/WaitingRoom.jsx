
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";

import {
    getCachedRoom,
    getRoomState,
    cacheRoom,
    startGame,
    leaveRoom,
    leaveCurrentRoom,
} from "../../services/roomService";

import { subscribeRoom } from "../../services/roomRealtime";

import "./WaitingRoom.css";

export default function WaitingRoom() {
    const { code } = useParams();
    const navigate = useNavigate();

    const codeTextRef = useRef(null);

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

    // ==========================================
    // 1. LẤY THÔNG TIN PHÒNG VÀ LẮNG NGHE REALTIME
    // ==========================================
    useEffect(() => {
        let active = true;
        let navigated = false;

        function goToGame(data) {
            if (!active || navigated) return;

            navigated = true;

            navigate(`/game/${code}`, {
                replace: true,
                state: {
                    matchId: data?.matchId,
                },
            });
        }

        const unsubscribe = subscribeRoom(code, {
            onStatus: (status) => {
                if (active) {
                    setConnection(status);
                }
            },

            onRoom: (updatedRoom) => {
                if (
                    !active ||
                    updatedRoom?.roomCode !== code
                ) {
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
                        ? {
                              ...previous,
                              status: "CLOSED",
                          }
                        : previous
                );

                setError("Chủ phòng đã đóng phòng.");
            },

            onError: (message) => {
                if (active) {
                    setError(message);
                }
            },
        });

        async function loadRoom() {
            setLoadingRoom(true);
            setError("");

            try {
                const freshRoom = await getRoomState(code);

                if (!active) return;

                setRoom(freshRoom);
                cacheRoom(freshRoom);

                if (freshRoom.status === "PLAYING") {
                    goToGame(freshRoom);
                }

                if (freshRoom.status === "CLOSED") {
                    setError("Phòng đã bị đóng.");
                }
            } catch (err) {
                if (active) {
                    setError(
                        err.message ||
                            "Không tải được thông tin phòng."
                    );
                }
            } finally {
                if (active) {
                    setLoadingRoom(false);
                }
            }
        }

        loadRoom();

        return () => {
            active = false;
            unsubscribe?.();
        };
    }, [code, navigate, retry]);

    // ==========================================
    // 2. BẮT ĐẦU TRẬN ĐẤU
    // ==========================================
    async function handleStart() {
        if (!canStart) return;

        setBusy("start");
        setError("");

        try {
            const startedRoom = await startGame(code);

            setRoom(startedRoom);

            navigate(`/game/${code}`, {
                replace: true,
                state: {
                    matchId: startedRoom.matchId,
                },
            });
        } catch (err) {
            setError(
                err.message || "Không thể bắt đầu trận đấu."
            );
        } finally {
            setBusy("");
        }
    }

    // ==========================================
    // 3. RỜI PHÒNG
    // ==========================================
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

            navigate("/", {
                replace: true,
            });
        } catch (err) {
            setError(
                err.message || "Không thể rời phòng."
            );
        } finally {
            setBusy("");
        }
    }

    // ==========================================
    // 4. CHỌN MÃ PHÒNG MÀU XANH
    // ==========================================
    function selectRoomCode() {
        const element = codeTextRef.current;

        if (!element) return;

        const selection = window.getSelection();

        if (!selection) return;

        const range = document.createRange();

        range.selectNodeContents(element);

        selection.removeAllRanges();
        selection.addRange(range);
    }

    // ==========================================
    // 5. SAO CHÉP MÃ PHÒNG
    // ==========================================
    async function handleCopyCode() {
        const roomCode = String(
            room?.roomCode || code || ""
        ).trim();

        if (!roomCode) {
            setNotice("Không tìm thấy mã phòng.");
            return;
        }

        setNotice("");

        // Ưu tiên Clipboard API khi chạy HTTPS/localhost.
        if (
            window.isSecureContext &&
            navigator.clipboard?.writeText
        ) {
            try {
                await navigator.clipboard.writeText(roomCode);

                setNotice(
                    "Đã gửi mã phòng vào clipboard: " +
                        roomCode
                );
                return;
            } catch (err) {
                console.warn(
                    "Clipboard API thất bại:",
                    err
                );
            }
        }

        // Dự phòng cho HTTP qua mạng LAN:
        // chọn trực tiếp mã phòng màu xanh.
        selectRoomCode();

        // Thử sao chép lựa chọn hiện tại.
        // Không coi kết quả execCommand là bằng chứng
        // chắc chắn rằng clipboard đã được cập nhật.
        let copied = false;

        try {
            copied = document.execCommand("copy");
        } catch (err) {
            console.warn(
                "Không thể sao chép tự động:",
                err
            );
        }

        // Chọn lại mã để hỗ trợ Ctrl+C thủ công.
        selectRoomCode();

       
    }

    // ==========================================
    // 6. VỀ TRANG CHỦ
    // ==========================================
    async function handleReturnHome() {
        if (busy) return;

        setBusy("leave");
        setError("");

        try {
            await leaveCurrentRoom();

            navigate("/", {
                replace: true,
            });
        } catch (err) {
            setError(
                err.message || "Không thể rời phòng."
            );
        } finally {
            setBusy("");
        }
    }

    // ==========================================
    // 7. TRẠNG THÁI NGƯỜI CHƠI
    // ==========================================
    function playerStatus(player) {
        if (!player) {
            return "Đang chờ người chơi";
        }

        if (player.connected === true) {
            return "Trực tuyến";
        }

        if (player.connected === false) {
            return "Mất kết nối";
        }

        return "Đã tham gia";
    }

    // ==========================================
    // 8. GIAO DIỆN ĐANG TẢI
    // ==========================================
    if (loadingRoom) {
        return (
            <div className="waiting-room-container">
                <div className="waiting-room-box">
                    <h2>Đang tải thông tin phòng...</h2>
                </div>
            </div>
        );
    }

    // ==========================================
    // 9. KHÔNG TÌM THẤY PHÒNG
    // ==========================================
    if (!room || room.roomCode !== code) {
        return (
            <div className="waiting-room-container">
                <div className="waiting-room-box">
                    <h2>Không thể mở phòng</h2>

                    <p className="waiting-room-error">
                        {error ||
                            "Không tìm thấy thông tin phòng."}
                    </p>

                    <button
                        type="button"
                        className="waiting-room-start"
                        onClick={() =>
                            setRetry((n) => n + 1)
                        }
                    >
                        THỬ LẠI
                    </button>

                    <button
                        type="button"
                        className="waiting-room-leave"
                        onClick={handleReturnHome}
                        disabled={Boolean(busy)}
                    >
                        VỀ TRANG CHỦ
                    </button>
                </div>
            </div>
        );
    }

    // ==========================================
    // 10. GIAO DIỆN PHÒNG CHỜ
    // ==========================================
    return (
        <div className="waiting-room-container">
            <div className="waiting-room-box">
                <h1>PHÒNG CHỜ</h1>

                <p className="waiting-room-subtitle">
                    Bingo Online 1vs1
                </p>

                {/* MÃ PHÒNG: CHỈ HIỂN THỊ MỘT MÃ */}
                <div className="waiting-room-code-box">
                    <span>MÃ PHÒNG</span>

                    <h2
                        ref={codeTextRef}
                        onClick={selectRoomCode}
                        title="Nhấn để chọn mã phòng"
                        style={{
                            cursor: "text",
                            userSelect: "text",
                        }}
                    >
                        {room.roomCode}
                    </h2>

                    <button
                        type="button"
                        className="waiting-room-copy"
                        onClick={handleCopyCode}
                    >
                        Sao chép mã
                    </button>
                </div>

                {/* THÔNG BÁO SAO CHÉP */}
                {notice && (
                    <p
                        className="waiting-room-success"
                        role="status"
                    >
                        {notice}
                    </p>
                )}

                {/* TRẠNG THÁI KẾT NỐI */}
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

                {/* DANH SÁCH NGƯỜI CHƠI */}
                <div className="waiting-room-players">
                    <div className="waiting-room-player">
                        <div className="waiting-room-avatar">
                            P1
                        </div>

                        <h3>{room.host?.displayName}</h3>

                        <span className="waiting-room-role">
                            CHỦ PHÒNG
                        </span>

                        <p>{playerStatus(room.host)}</p>
                    </div>

                    <div className="waiting-room-player">
                        <div className="waiting-room-avatar">
                            P2
                        </div>

                        <h3>
                            {room.guest?.displayName ||
                                "Đang chờ..."}
                        </h3>

                        <span className="waiting-room-role guest">
                            NGƯỜI THAM GIA
                        </span>

                        <p>{playerStatus(room.guest)}</p>
                    </div>
                </div>

                {/* THÔNG BÁO LỖI */}
                {error && (
                    <div
                        className="waiting-room-error"
                        role="alert"
                    >
                        {error}
                    </div>
                )}

                {/* KẾT NỐI LẠI */}
                {connection === "disconnected" &&
                    !isClosed && (
                        <button
                            type="button"
                            className="waiting-room-retry"
                            onClick={() =>
                                setRetry((n) => n + 1)
                            }
                        >
                            THỬ KẾT NỐI LẠI
                        </button>
                    )}

                {/* PHÒNG CHƯA ĐÓNG */}
                {!isClosed && (
                    <>
                        {isHost ? (
                            <>
                                {!hasTwoPlayers && (
                                    <p className="waiting-room-note">
                                        Đang chờ người chơi thứ hai...
                                    </p>
                                )}

                                <button
                                    type="button"
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
                            type="button"
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

                {/* PHÒNG ĐÃ ĐÓNG */}
                {isClosed && (
                    <button
                        type="button"
                        className="waiting-room-leave"
                        onClick={handleReturnHome}
                        disabled={Boolean(busy)}
                    >
                        {busy === "leave"
                            ? "ĐANG RỜI PHÒNG..."
                            : "VỀ TRANG CHỦ"}
                    </button>
                )}
            </div>
        </div>
    );
}
