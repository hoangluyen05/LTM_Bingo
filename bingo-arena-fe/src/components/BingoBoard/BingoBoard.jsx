import { useRef, useState } from "react";
import { getCompletedLines } from "../../utils/bingo";
import "./BingoBoard.css";

export default function BingoBoard({
    board = [], calledNumbers = [], canPlay = false, canArrange = false,
    onSelect, onSwap,
}) {
    const [selected, setSelected] = useState(null);
    const [dragging, setDragging] = useState(null);
    const [hovered, setHovered] = useState(null);
    const pointer = useRef(null);
    const cells = Array.isArray(board) ? board.flat() : [];
    const called = Array.isArray(calledNumbers) ? calledNumbers : [];
    const valid = cells.length === 25 &&
        cells.every(n => Number.isInteger(n) && n >= 1 && n <= 25) &&
        new Set(cells).size === 25;
    if (!valid) return <div className="bingo-board-wrapper">Đang tải bảng Bingo...</div>;

    const calledSet = new Set(called);
    const completed = new Set(getCompletedLines(cells, called).flat());

    function swap(a, b) {
        if (canArrange && a !== null && b !== null && a !== b) onSwap?.(a, b);
    }

    function handlePointerDown(event, index) {
        if (!canArrange || event.button !== 0) return;
        pointer.current = { index, x: event.clientX, y: event.clientY, moved: false };
        setDragging(index);
        event.currentTarget.setPointerCapture(event.pointerId);
    }

    function handlePointerMove(event) {
        const p = pointer.current;
        if (!p || !canArrange) return;
        if (Math.hypot(event.clientX - p.x, event.clientY - p.y) > 7) p.moved = true;
        if (!p.moved) return;
        const element = document.elementFromPoint(event.clientX, event.clientY);
        const cell = element?.closest?.("[data-bingo-index]");
        setHovered(cell ? Number(cell.dataset.bingoIndex) : null);
    }

    function handlePointerUp(event, index) {
        const p = pointer.current;
        pointer.current = null;
        setDragging(null);
        setHovered(null);
        if (!p || !canArrange) return;
        if (p.moved) {
            const target = document.elementFromPoint(event.clientX, event.clientY)
                ?.closest?.("[data-bingo-index]");
            if (target) swap(p.index, Number(target.dataset.bingoIndex));
            setSelected(null);
        } else if (selected === null) {
            setSelected(index);
        } else {
            swap(selected, index);
            setSelected(null);
        }
    }

    return <div className="bingo-board-wrapper">
        <div className="bingo-board-grid">
            {["B", "I", "N", "G", "O"].map(letter =>
                <div className="bingo-board-heading" key={letter}>{letter}</div>
            )}
            {cells.map((number, index) => {
                const marked = calledSet.has(number);
                return <button
                    key={index}
                    type="button"
                    data-bingo-index={index}
                    className={[
                        "bingo-board-cell", marked ? "marked" : "",
                        completed.has(index) ? "completed" : "",
                        canArrange ? "arrangeable" : "",
                        selected === index ? "selected-cell" : "",
                        dragging === index ? "dragging" : "",
                        hovered === index ? "drag-over" : "",
                    ].filter(Boolean).join(" ")}
                    disabled={!canArrange && (!canPlay || marked)}
                    onPointerDown={event => handlePointerDown(event, index)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={event => handlePointerUp(event, index)}
                    onPointerCancel={() => { pointer.current = null; setDragging(null); setHovered(null); }}
                    onClick={() => { if (!canArrange && canPlay && !marked) onSelect?.(number); }}
                    aria-label={`Số ${number}`}
                    aria-pressed={canArrange ? selected === index : marked}
                >{number}</button>;
            })}
        </div>
        {canArrange
            ? <p className="bingo-arrange-hint">Kéo ô số đến ô khác để đổi vị trí (hoặc chọn lần lượt 2 ô).</p>
            : <div className="bingo-board-legend"><span>⬛ Chưa gọi</span><span>🟪 Đã gọi</span><span>🟩 Đường Bingo</span></div>}
    </div>;
}
