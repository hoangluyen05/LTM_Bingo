
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { getMatchHistory } from "../../services/gameService";

import "./History.css";

export default function History() {
    const navigate = useNavigate();

    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState("ALL");
    const [retry, setRetry] = useState(0);

    // Lấy lịch sử từ mock hoặc API Spring Boot
    useEffect(() => {
        let active = true;

        async function loadHistory() {
            setLoading(true);
            setError(null);

            try {
                const data = await getMatchHistory();

                if (!active) return;

                setHistory(data);
            } catch (err) {
                if (!active) return;

                setHistory([]);
                setError({
                    message:
                        err.message || "Không thể tải lịch sử trận đấu.",
                    status: err.status,
                    code: err.code,
                });
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadHistory();

        // Tránh cập nhật state khi component đã unmount
        return () => {
            active = false;
        };
    }, [retry]);

    // Thử tải dữ liệu lại
    function handleRetry() {
        setRetry((prev) => prev + 1);
    }

    // Đăng nhập lại khi token hết hạn
    function handleLoginAgain() {
        sessionStorage.removeItem("bingo_access_token");
        sessionStorage.removeItem("bingo_user");
        sessionStorage.removeItem("bingo_current_room");

        navigate("/login", { replace: true });
    }

    // Định dạng ngày giờ
    function formatDate(dateString) {
        if (!dateString) return "Không xác định";

        const date = new Date(dateString);

        if (Number.isNaN(date.getTime())) {
            return "Không xác định";
        }

        return new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    }

    // Lọc theo kết quả
    const filteredHistory = history.filter((item) => {
        if (filter === "ALL") return true;

        return item.result === filter;
    });

    return (
        <div className="history-container">
            <div className="history-box">

                {/* Tiêu đề */}
                <div className="history-header">
                    <div>
                        <h1>LỊCH SỬ TRẬN ĐẤU</h1>
                        <p>
                            Xem lại các trận Bingo 1vs1 đã hoàn thành
                        </p>
                    </div>
                </div>

                {/* Bộ lọc */}
                <div className="history-filters">
                    <button
                        type="button"
                        className={
                            filter === "ALL" ? "history-active" : ""
                        }
                        onClick={() => setFilter("ALL")}
                        aria-pressed={filter === "ALL"}
                    >
                        Tất cả
                    </button>

                    <button
                        type="button"
                        className={
                            filter === "WIN" ? "history-active" : ""
                        }
                        onClick={() => setFilter("WIN")}
                        aria-pressed={filter === "WIN"}
                    >
                        Thắng
                    </button>

                    <button
                        type="button"
                        className={
                            filter === "LOSE" ? "history-active" : ""
                        }
                        onClick={() => setFilter("LOSE")}
                        aria-pressed={filter === "LOSE"}
                    >
                        Thua
                    </button>
                </div>

                {/* Đang tải */}
                {loading && (
                    <div className="history-loading" role="status">
                        <div className="history-spinner"></div>
                        <p>Đang tải lịch sử trận đấu...</p>
                    </div>
                )}

                {/* Lỗi Server */}
                {!loading && error && (
                    <div className="history-error" role="alert">
                        <h3>Không thể tải lịch sử</h3>
                        <p>{error.message}</p>

                        {error.status === 401 ? (
                            <button onClick={handleLoginAgain}>
                                ĐĂNG NHẬP LẠI
                            </button>
                        ) : (
                            <button onClick={handleRetry}>
                                THỬ LẠI
                            </button>
                        )}
                    </div>
                )}

                {/* Không có trận đấu */}
                {!loading && !error && history.length === 0 && (
                    <div className="history-empty">
                        <div className="history-empty-icon">🎮</div>

                        <h3>Chưa có trận đấu nào</h3>

                        <p>
                            Hãy tham gia một trận Bingo để bắt đầu
                            ghi lại lịch sử của bạn.
                        </p>

                        <button onClick={() => navigate("/")}>
                            CHƠI NGAY
                        </button>
                    </div>
                )}

                {/* Có lịch sử */}
                {!loading && !error && history.length > 0 && (
                    <>
                        <p className="history-count">
                            Hiển thị {filteredHistory.length} /
                            {" "}{history.length} trận đấu
                        </p>

                        {filteredHistory.length === 0 ? (
                            <div className="history-empty">
                                <h3>Không có trận đấu phù hợp</h3>
                                <p>Hãy chọn bộ lọc khác.</p>

                                <button onClick={() => setFilter("ALL")}>
                                    XEM TẤT CẢ
                                </button>
                            </div>
                        ) : (
                            <div className="history-table-wrapper">
                                <table className="history-table">
                                    <thead>
                                        <tr>
                                            <th>Ngày chơi</th>
                                            <th>Đối thủ</th>
                                            <th>Kết quả</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {filteredHistory.map((item) => (
                                            <tr key={item.matchId}>
                                                <td>
                                                    {formatDate(item.endedAt)}
                                                </td>

                                                <td>{item.opponentName}</td>

                                                <td>
                                                    <span
                                                        className={
                                                            item.result === "WIN"
                                                                ? "history-result history-win"
                                                                : "history-result history-lose"
                                                        }
                                                    >
                                                        {item.result === "WIN"
                                                            ? "THẮNG"
                                                            : "THUA"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                {/* Nút quay về */}
                <button
                    className="history-back-button"
                    onClick={() => navigate("/")}
                >
                    QUAY VỀ TRANG CHỦ
                </button>
            </div>
        </div>
    );
}
