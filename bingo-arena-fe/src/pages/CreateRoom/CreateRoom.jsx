
import { useRef, useState } from "react";
import { useNavigate } from "react-router";

import {
    createRoom,
    getCachedRoom,
} from "../../services/roomService";

import "./CreateRoom.css";

export default function CreateRoom() {
    const navigate = useNavigate();
    const codeInputRef = useRef(null);

    const [room, setRoom] = useState(() => {
        const cached = getCachedRoom();

        const user = JSON.parse(
            sessionStorage.getItem("bingo_user") || "null"
        );

        return cached?.host?.id === user?.id ? cached : null;
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState("");

    async function handleCreateRoom() {
        if (loading || room) return;

        setLoading(true);
        setError(null);
        setNotice("");

        try {
            const newRoom = await createRoom();

            setRoom(newRoom);
            setNotice("Tạo phòng thành công!");
        } catch (err) {
            setError({
                message: err.message,
                status: err.status,
                code: err.code,
            });

            if (err.code === "ROOM_ALREADY_EXISTS") {
                const oldRoom = getCachedRoom();
                if (oldRoom) setRoom(oldRoom);
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleCopyCode() {
        if (!room) return;

        try {
            if (!navigator.clipboard?.writeText) {
                throw new Error("Clipboard unavailable");
            }

            await navigator.clipboard.writeText(room.roomCode);
            setNotice("Đã sao chép mã phòng!");
        } catch {
            codeInputRef.current?.select();
            setNotice(
                "Không thể sao chép tự động. Hãy nhấn Ctrl+C để sao chép mã."
            );
        }
    }

    function handleEnterRoom() {
        if (!room) return;

        navigate(`/room/${room.roomCode}`);
    }

    function handleLoginAgain() {
        sessionStorage.removeItem("bingo_access_token");
        sessionStorage.removeItem("bingo_user");

        navigate("/login", { replace: true });
    }

    return (
        <div className="create-room-container">
            <div className="create-room-box">
                <div className="create-room-icon">🎮</div>

                <h1 className="create-room-title">
                    TẠO PHÒNG
                </h1>

                <p className="create-room-subtitle">
                    Tạo phòng Bingo để chơi cùng bạn bè
                </p>

                {/* Thông báo thành công */}
                {notice && (
                    <div
                        className="create-room-success"
                        role="status"
                    >
                        {notice}
                    </div>
                )}

                {/* Thông báo lỗi */}
                {error && (
                    <div
                        className="create-room-error"
                        role="alert"
                    >
                        <p>{error.message}</p>

                        {error.status === 401 && (
                            <button
                                className="create-room-error-link"
                                onClick={handleLoginAgain}
                            >
                                Đăng nhập lại
                            </button>
                        )}

                        {error.status !== 401 && !room && (
                            <button
                                className="create-room-error-link"
                                onClick={handleCreateRoom}
                                disabled={loading}
                            >
                                Thử lại
                            </button>
                        )}
                    </div>
                )}

                {/* Chưa tạo phòng */}
                {!room && (
                    <>
                        <div className="create-room-info">
                            <p>Chế độ: Bingo Online 1vs1</p>
                            <p>Số người chơi tối đa: 2</p>
                        </div>

                        <button
                            className="create-room-button"
                            onClick={handleCreateRoom}
                            disabled={loading}
                        >
                            {loading
                                ? "ĐANG TẠO PHÒNG..."
                                : "+ TẠO PHÒNG MỚI"}
                        </button>
                    </>
                )}

                {/* Đã tạo phòng */}
                {room && (
                    <>
                        <div className="create-room-code-box">
                            <p>MÃ PHÒNG CỦA BẠN</p>

                            <input
                                ref={codeInputRef}
                                className="create-room-code"
                                value={room.roomCode}
                                readOnly
                                onClick={(e) => e.target.select()}
                                aria-label="Mã phòng"
                            />

                            <span>
                                Chia sẻ mã này cho người chơi thứ hai
                            </span>
                        </div>

                        <button
                            className="create-room-copy-button"
                            onClick={handleCopyCode}
                        >
                            SAO CHÉP MÃ PHÒNG
                        </button>

                        <button
                            className="create-room-enter-button"
                            onClick={handleEnterRoom}
                        >
                            VÀO PHÒNG CHỜ
                        </button>
                    </>
                )}

                <button
                    className="create-room-back-button"
                    onClick={() => navigate("/")}
                    disabled={loading}
                >
                    QUAY LẠI TRANG CHỦ
                </button>
            </div>
        </div>
    );
}
