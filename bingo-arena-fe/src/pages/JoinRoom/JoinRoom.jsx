
import { useState } from "react";
import { useNavigate } from "react-router";

import {
    joinRoom,
    getCachedRoom,
} from "../../services/roomService";

import "./JoinRoom.css";

function JoinRoom() {
    const navigate = useNavigate();

    const [roomCode, setRoomCode] = useState("");
    const [touched, setTouched] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState(null);
    const [fieldError, setFieldError] = useState("");

    // Kiểm tra dữ liệu nhập
    function validateCode(value) {
        const code = value.trim().toUpperCase();

        if (!code) {
            return "Vui lòng nhập mã phòng!";
        }

        if (!/^BG-[0-9]{4}$/.test(code)) {
            return "Mã phòng phải có dạng BG-1234.";
        }

        return "";
    }

    const validationError = validateCode(roomCode);

    const displayedError =
        fieldError ||
        (touched || submitted ? validationError : "");

    // Người dùng nhập mã phòng
    function handleChange(e) {
        const value = e.target.value.toUpperCase();

        setRoomCode(value);
        setFieldError("");
        setServerError(null);
    }

    // Gửi yêu cầu tham gia phòng
    async function handleSubmit(e) {
        e.preventDefault();

        if (loading) return;

        setSubmitted(true);
        setServerError(null);
        setFieldError("");

        const error = validateCode(roomCode);

        if (error) return;

        setLoading(true);

        try {
            const room = await joinRoom(roomCode);

            // Thành công thì chuyển đến phòng chờ
            navigate(`/room/${room.roomCode}`, {
                replace: true,
            });
        } catch (error) {
            const code = error.code;

            // Những lỗi liên quan trực tiếp đến mã phòng
            if (
                code === "ROOM_NOT_FOUND" ||
                code === "INVALID_ROOM_CODE"
            ) {
                setFieldError(error.message);
            } else if (error.fieldErrors?.roomCode) {
                setFieldError(error.fieldErrors.roomCode);
            } else {
                setServerError({
                    message: error.message,
                    code: error.code,
                    status: error.status,
                });
            }
        } finally {
            setLoading(false);
        }
    }

    function handleLoginAgain() {
        sessionStorage.removeItem("bingo_access_token");
        sessionStorage.removeItem("bingo_user");
        sessionStorage.removeItem("bingo_current_room");

        navigate("/login", { replace: true });
    }

    function handleReturnToRoom() {
        const room = getCachedRoom();

        if (room) {
            navigate(`/room/${room.roomCode}`);
        } else {
            navigate("/");
        }
    }

    return (
        <div className="join-room-container">
            <div className="join-room-box">
                <div className="join-room-icon">🎮</div>

                <h1 className="join-room-title">
                    THAM GIA PHÒNG
                </h1>

                <p className="join-room-subtitle">
                    Nhập mã phòng để chơi Bingo cùng bạn bè
                </p>

                {/* Lỗi chung từ Server */}
                {serverError && (
                    <div
                        className="join-room-error"
                        role="alert"
                    >
                        <p>{serverError.message}</p>

                        {serverError.status === 401 && (
                            <button
                                className="join-room-error-action"
                                onClick={handleLoginAgain}
                            >
                                Đăng nhập lại
                            </button>
                        )}

                        {serverError.code === "ALREADY_IN_ROOM" && (
                            <button
                                className="join-room-error-action"
                                onClick={handleReturnToRoom}
                            >
                                Vào phòng hiện tại
                            </button>
                        )}
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                    <div className="join-room-field">
                        <label htmlFor="room-code">
                            Mã phòng
                        </label>

                        <input
                            id="room-code"
                            type="text"
                            placeholder="Ví dụ: BG-1234"
                            value={roomCode}
                            maxLength={7}
                            autoComplete="off"
                            spellCheck={false}
                            disabled={loading}
                            onChange={handleChange}
                            onBlur={() => setTouched(true)}
                            className={
                                displayedError ? "join-room-input-error" : ""
                            }
                            aria-invalid={Boolean(displayedError)}
                            aria-describedby={
                                displayedError ? "room-code-error" : undefined
                            }
                        />

                        {displayedError && (
                            <p
                                id="room-code-error"
                                className="join-room-field-error"
                                role="alert"
                            >
                                {displayedError}
                            </p>
                        )}

                        <p className="join-room-hint">
                            Mã gồm BG- và 4 chữ số.
                        </p>
                    </div>

                    <button
                        type="submit"
                        className="join-room-submit"
                        disabled={loading}
                    >
                        {loading
                            ? "ĐANG THAM GIA..."
                            : "THAM GIA PHÒNG"}
                    </button>
                </form>

                <button
                    className="join-room-back"
                    onClick={() => navigate("/")}
                    disabled={loading}
                >
                    QUAY LẠI TRANG CHỦ
                </button>
            </div>
        </div>
    );
}

export default JoinRoom;
