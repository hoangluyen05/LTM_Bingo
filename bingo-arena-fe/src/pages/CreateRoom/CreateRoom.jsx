
import { useRef, useState } from "react";
import { useNavigate } from "react-router";

import {
    createRoom,
    getCachedRoom,
    leaveCurrentRoom,
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

        return cached?.host?.id === user?.id
            ? cached
            : null;
    });

    const [loading, setLoading] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState("");

    // ==========================================
    // 1. TẠO PHÒNG MỚI
    // ==========================================
    async function handleCreateRoom() {
        if (loading || leaving || room) return;

        setLoading(true);
        setError(null);
        setNotice("");

        try {
            const newRoom = await createRoom();

            setRoom(newRoom);
            setNotice("Tạo phòng thành công!");
        } catch (err) {
            setError({
                message:
                    err.message ||
                    "Không thể tạo phòng.",
                status: err.status,
                code: err.code,
            });

            if (err.code === "ROOM_ALREADY_EXISTS") {
                const oldRoom = getCachedRoom();

                if (oldRoom) {
                    setRoom(oldRoom);
                }
            }
        } finally {
            setLoading(false);
        }
    }

    // ==========================================
    // 2. SAO CHÉP MÃ PHÒNG
    // Hỗ trợ localhost, HTTPS và HTTP LAN
    // ==========================================
    async function handleCopyCode() {
        if (!room?.roomCode) {
            setNotice("Không tìm thấy mã phòng.");
            return;
        }

        const code = String(room.roomCode).trim();

        setNotice("");

        // Cách 1: Clipboard API
        // Hoạt động trên localhost hoặc HTTPS.
        if (
            window.isSecureContext &&
            navigator.clipboard?.writeText
        ) {
            try {
                await navigator.clipboard.writeText(code);

                setNotice(
                    "Đã sao chép mã phòng: " + code
                );

                return;
            } catch (err) {
                console.warn(
                    "Clipboard API không hoạt động:",
                    err
                );
            }
        }

        // Cách 2: Sao chép dự phòng bằng
        // document.execCommand("copy").
        // Có thể hoạt động khi truy cập HTTP LAN.
        let copied = false;

        const input = codeInputRef.current;

        if (input) {
            try {
                input.focus();
                input.select();
                input.setSelectionRange(
                    0,
                    input.value.length
                );

                copied = document.execCommand("copy");
            } catch (err) {
                console.warn(
                    "Không thể sao chép từ input:",
                    err
                );
            }
        }

        // Cách 3: Tạo textarea tạm thời
        // nếu cách 2 không thành công.
        if (!copied) {
            const textarea =
                document.createElement("textarea");

            textarea.value = code;
            textarea.readOnly = true;

            textarea.style.position = "fixed";
            textarea.style.left = "-9999px";
            textarea.style.top = "0";
            textarea.style.opacity = "0";

            document.body.appendChild(textarea);

            try {
                textarea.focus();
                textarea.select();

                textarea.setSelectionRange(
                    0,
                    code.length
                );

                copied =
                    document.execCommand("copy");
            } catch (err) {
                console.warn(
                    "Không thể sao chép bằng textarea:",
                    err
                );
            } finally {
                document.body.removeChild(textarea);
            }
        }

        // Kết quả
        if (copied) {
            setNotice(
                "Đã sao chép mã phòng: " + code
            );
        } else {
            // Giữ mã phòng được bôi đen
            // để người dùng nhấn Ctrl+C.
            codeInputRef.current?.focus();
            codeInputRef.current?.select();

            setNotice(
                "Trình duyệt không cho phép sao chép tự động. " +
                "Mã phòng đã được chọn, hãy nhấn Ctrl+C."
            );
        }
    }

    // ==========================================
    // 3. VÀO PHÒNG CHỜ
    // ==========================================
    function handleEnterRoom() {
        if (!room || loading || leaving) return;

        navigate(`/room/${room.roomCode}`);
    }

    // ==========================================
    // 4. ĐĂNG NHẬP LẠI
    // ==========================================
    function handleLoginAgain() {
        // Chỉ sử dụng khi token hết hạn.
        // Nếu không còn token hợp lệ,
        // Backend cần có cơ chế dọn phòng
        // khi phiên đăng nhập hết hiệu lực.
        sessionStorage.removeItem(
            "bingo_access_token"
        );

        sessionStorage.removeItem("bingo_user");

        navigate("/login", {
            replace: true,
        });
    }

    // ==========================================
    // 5. QUAY LẠI TRANG CHỦ
    // ==========================================
    async function handleBackHome() {
        if (loading || leaving) return;

        // Chưa tạo phòng thì chỉ cần quay lại.
        if (!room) {
            navigate("/");
            return;
        }

        const confirmed = window.confirm(
            "Bạn có chắc chắn muốn rời phòng? " +
            "Phòng hiện tại sẽ được đóng."
        );

        if (!confirmed) return;

        setLeaving(true);
        setError(null);
        setNotice("");

        try {
            // Yêu cầu Backend giải phóng phòng.
            await leaveCurrentRoom();

            setRoom(null);

            // Chỉ điều hướng sau khi Backend
            // xác nhận rời phòng thành công.
            navigate("/", {
                replace: true,
            });
        } catch (err) {
            console.error(
                "Lỗi khi rời phòng:",
                err
            );

            setError({
                message:
                    err.message ||
                    "Không thể rời phòng. Vui lòng thử lại.",
                status: err.status,
                code: err.code,
            });
        } finally {
            setLeaving(false);
        }
    }

    // ==========================================
    // 6. GIAO DIỆN
    // ==========================================
    return (
        <div className="create-room-container">
            <div className="create-room-box">

                <div className="create-room-icon">
                    🎮
                </div>

                <h1 className="create-room-title">
                    TẠO PHÒNG
                </h1>

                <p className="create-room-subtitle">
                    Tạo phòng Bingo để chơi cùng bạn bè
                </p>

                {/* THÔNG BÁO THÀNH CÔNG */}
                {notice && (
                    <div
                        className="create-room-success"
                        role="status"
                    >
                        {notice}
                    </div>
                )}

                {/* THÔNG BÁO LỖI */}
                {error && (
                    <div
                        className="create-room-error"
                        role="alert"
                    >
                        <p>{error.message}</p>

                        {error.status === 401 && (
                            <button
                                type="button"
                                className="create-room-error-link"
                                onClick={handleLoginAgain}
                            >
                                Đăng nhập lại
                            </button>
                        )}

                        {error.status !== 401 &&
                            !room && (
                                <button
                                    type="button"
                                    className="create-room-error-link"
                                    onClick={handleCreateRoom}
                                    disabled={loading || leaving}
                                >
                                    Thử lại
                                </button>
                            )}
                    </div>
                )}

                {/* CHƯA TẠO PHÒNG */}
                {!room && (
                    <>
                        <div className="create-room-info">
                            <p>
                                Chế độ: Bingo Online 1vs1
                            </p>

                            <p>
                                Số người chơi tối đa: 2
                            </p>
                        </div>

                        <button
                            type="button"
                            className="create-room-button"
                            onClick={handleCreateRoom}
                            disabled={loading || leaving}
                        >
                            {loading
                                ? "ĐANG TẠO PHÒNG..."
                                : "+ TẠO PHÒNG MỚI"}
                        </button>
                    </>
                )}

                {/* ĐÃ TẠO PHÒNG */}
                {room && (
                    <>
                        <div className="create-room-code-box">
                            <p>
                                MÃ PHÒNG CỦA BẠN
                            </p>

                            <input
                                ref={codeInputRef}
                                className="create-room-code"
                                value={room.roomCode}
                                readOnly
                                onClick={(e) =>
                                    e.target.select()
                                }
                                aria-label="Mã phòng"
                            />

                            <span>
                                Chia sẻ mã này cho người
                                chơi thứ hai
                            </span>
                        </div>

                        <button
                            type="button"
                            className="create-room-copy-button"
                            onClick={handleCopyCode}
                            disabled={leaving}
                        >
                            SAO CHÉP MÃ PHÒNG
                        </button>

                        <button
                            type="button"
                            className="create-room-enter-button"
                            onClick={handleEnterRoom}
                            disabled={loading || leaving}
                        >
                            VÀO PHÒNG CHỜ
                        </button>
                    </>
                )}

                {/* QUAY LẠI TRANG CHỦ */}
                <button
                    type="button"
                    className="create-room-back-button"
                    onClick={handleBackHome}
                    disabled={loading || leaving}
                >
                    {leaving
                        ? "ĐANG RỜI PHÒNG..."
                        : "QUAY LẠI TRANG CHỦ"}
                </button>

            </div>
        </div>
    );
}
