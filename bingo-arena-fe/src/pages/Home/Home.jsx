
import { useLocation, useNavigate } from "react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import LoginWelcome from "../../components/LoginWelcome/LoginWelcome";
import { leaveCurrentRoom } from "../../services/roomService";
import "./Home.css";

function Home() {
    const navigate = useNavigate();
    const location = useLocation();
    const [showWelcome, setShowWelcome] = useState(() => Boolean(location.state?.welcome));
    const homeTitle = useRef(null);
    const finishWelcome = useCallback(() => {
        setShowWelcome(false);
        window.requestAnimationFrame(() => homeTitle.current?.focus());
    }, []);

    useEffect(() => {
        if (location.state?.welcome) navigate("/", { replace: true, state: null });
    }, [location.state, navigate]);

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
            {showWelcome && <LoginWelcome username={username} onDone={finishWelcome} />}
            <div className="home-box" inert={showWelcome}>
                <div className="home-logo">B</div>

                <h1 className="home-title" ref={homeTitle} tabIndex={-1}>
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
