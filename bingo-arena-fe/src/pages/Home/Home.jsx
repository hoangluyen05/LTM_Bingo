
import { useNavigate } from "react-router";
import "./Home.css";

function Home() {
    const navigate = useNavigate();


    const user = JSON.parse(
        sessionStorage.getItem("bingo_user") || "null"
    );

    const username = user?.displayName || user?.username;

    const handleLogout = () => {
        sessionStorage.removeItem("bingo_access_token");
        sessionStorage.removeItem("bingo_user");
        sessionStorage.removeItem("bingo_current_room");
        navigate("/login", { replace: true });
    };

    return (
        <div className="home-container">
            <div className="home-box">
                <div className="home-logo">B</div>

                <h1 className="home-title">BINGO ARENA</h1>

                <p className="home-player">
                    Người chơi: <strong>{username}</strong>
                </p>

                <button
                    className="home-button home-create"
                    onClick={() => navigate("/create-room")}
                >
                    + TẠO PHÒNG
                </button>

                <button
                    className="home-button home-join"
                    onClick={() => navigate("/join-room")}
                >
                    THAM GIA PHÒNG
                </button>

                <button
                    className="home-button home-history"
                    onClick={() => navigate("/history")}
                >
                    LỊCH SỬ TRẬN ĐẤU
                </button>
                <button
                    className="home-button home-logout"
                    onClick={handleLogout}
                >
                    ĐĂNG XUẤT
                </button>
            </div>
        </div>
    );
}

export default Home;
