
import { getCompletedLines } from "../../utils/bingo";
import "./BingoBoard.css";

export default function BingoBoard({
    board = [],
    calledNumbers = [],
    canPlay = false,
    onSelect,
}) {
    // Chấp nhận bảng dạng:
    // [1, 2, ..., 25]
    // hoặc [[...5 số], [...5 số], ...]
    const normalizedBoard = Array.isArray(board)
        ? board.flat()
        : [];

    const normalizedCalledNumbers = Array.isArray(calledNumbers)
        ? calledNumbers
        : [];

    const validBoard =
        normalizedBoard.length === 25 &&
        normalizedBoard.every(
            (number) =>
                Number.isInteger(number) &&
                number >= 1 &&
                number <= 25
        ) &&
        new Set(normalizedBoard).size === 25;

    if (import.meta.env.DEV) {
        console.log("[BingoBoard] Original board:", board);
        console.log(
            "[BingoBoard] Normalized board:",
            normalizedBoard
        );
        console.log("[BingoBoard] Valid:", validBoard);
    }

    if (!validBoard) {
        return (
            <div className="bingo-board-wrapper">
                <div style={{ textAlign: "center", padding: "24px" }}>
                    <h3>BẢNG BINGO CỦA BẠN</h3>
                    <p>Đang tải bảng Bingo...</p>
                    <small>
                        Đã nhận {normalizedBoard.length}/25 ô
                    </small>
                </div>
            </div>
        );
    }

    const completedLines = getCompletedLines(
        normalizedBoard,
        normalizedCalledNumbers
    );

    const completedCells = new Set(
        completedLines.flat()
    );

    const calledSet = new Set(normalizedCalledNumbers);

    return (
        <div className="bingo-board-wrapper">
            <div className="bingo-board-grid">
                {["B", "I", "N", "G", "O"].map((letter) => (
                    <div
                        className="bingo-board-heading"
                        key={letter}
                    >
                        {letter}
                    </div>
                ))}

                {normalizedBoard.map((number, index) => {
                    const marked = calledSet.has(number);
                    const completed = completedCells.has(index);

                    return (
                        <button
                            key={`${index}-${number}`}
                            type="button"
                            className={[
                                "bingo-board-cell",
                                marked ? "marked" : "",
                                completed ? "completed" : "",
                            ]
                                .filter(Boolean)
                                .join(" ")}
                            disabled={!canPlay || marked}
                            onClick={() => onSelect?.(number)}
                            aria-label={`Số ${number}`}
                            aria-pressed={marked}
                        >
                            {number}
                        </button>
                    );
                })}
            </div>

            <div className="bingo-board-legend">
                <span>⬛ Chưa gọi</span>
                <span>🟪 Đã gọi</span>
                <span>🟩 Đường Bingo</span>
            </div>
        </div>
    );
}
