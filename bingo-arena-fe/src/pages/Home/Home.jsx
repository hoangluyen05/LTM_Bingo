
import { useNavigate } from "react-router";
import { useState } from "react";
import { leaveCurrentRoom } from "../../services/roomService";
import "./Home.css";

function Home() {
    const navigate = useNavigate();

    const [logoutBusy, setLogoutBusy] = useState(false);
    const [logoutError, setLogoutError] = useState("");

    const user = JSON.parse(
        sessionStorage.getItem("bingo_user") || "null"
    );

    const username =
        user?.displayName || user?.username;

    const handleLogout = async () => {
        if (logoutBusy) return;

        setLogoutBusy(true);
        setLogoutError("");

        try {
            // Backend xử lý phòng và kết quả trận trước.
            await leaveCurrentRoom();

            // Chỉ xóa token sau khi Backend xử lý xong.
            sessionStorage.removeItem(
                "bingo_access_token"
            );
            sessionStorage.removeItem("bingo_user");
            sessionStorage.removeItem(
                "bingo_current_room"
            );

            navigate("/login", {
                replace: true,
            });
        } catch (err) {
            setLogoutError(
                err.message ||
                "Không thể rời phòng. Vui lòng thử lại."
            );
        } finally {
            setLogoutBusy(false);
        }
    };

    return (
        <div className="home-container">
            <div className="home-box">
                <div className="home-logo">B</div>

                <h1 className="home-title">
                    BINGO ARENA
                </h1>

                <p className="home-player">
                    Người chơi:{" "}
                    <strong>{username}</strong>
                </p>

                <button
                    className="home-button home-create"
                    onClick={() =>
                        navigate("/create-room")
                    }
                >
                    + TẠO PHÒNG
                </button>

                <button
                    className="home-button home-join"
                    onClick={() =>
                        navigate("/join-room")
                    }
                >
                    THAM GIA PHÒNG
                </button>

                <button
                    className="home-button home-history"
                    onClick={() =>
                        navigate("/history")
                    }
                >
                    LỊCH SỬ TRẬN ĐẤU
                </button>

                {logoutError && (
                    <p role="alert">
                        {logoutError}
                    </p>
                )}

                <button
                    disabled={logoutBusy}
                    className="home-button home-logout"
                    onClick={handleLogout}
                >
                    {logoutBusy
                        ? "ĐANG ĐĂNG XUẤT..."
                        : "ĐĂNG XUẤT"}
                </button>
            </div>
        </div>
    );
}

export default Home;
