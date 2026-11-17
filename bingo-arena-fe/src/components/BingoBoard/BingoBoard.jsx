import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getCompletedLines } from "../../utils/bingo";
import "./BingoBoard.css";
import useBingoCelebration from "./useBingoCelebration";

export default function BingoBoard({
    board = [], calledNumbers = [], canPlay = false, canArrange = false,
    onSelect, onSwap, matchId,
}) {
    const [selected, setSelected] = useState(null);
    const [dragging, setDragging] = useState(null);
    const [hovered, setHovered] = useState(null);
    const pointer = useRef(null);
    const cells = Array.isArray(board) ? board.flat() : [];
    const called = Array.isArray(calledNumbers) ? calledNumbers : [];
    const size = Math.sqrt(cells.length);
    const valid = [5, 6, 7, 8].includes(size) &&
        cells.every(n => Number.isInteger(n) && n >= 1 && n <= cells.length) &&
        new Set(cells).size === cells.length;
    const lines = valid ? getCompletedLines(cells, called) : [];
    const { icons, banner } = useBingoCelebration(valid ? cells.join(",") : "", JSON.stringify(lines), matchId);
    if (!valid) return <div className="bingo-board-wrapper">Đang tải bảng Bingo...</div>;

    const calledSet = new Set(called);
    const completed = new Set(lines.flat());

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
        {banner && createPortal(<div className="bingo-celebration" key={banner.id}>
            <div className="bingo-celebration-bursts" aria-hidden="true">
                {[0, 1, 2, 3].map(burst => <div className="bingo-mini-firework" key={burst} style={{ "--burst-x": `${[12, 88, 25, 76][burst]}%`, "--burst-y": `${[25, 35, 75, 72][burst]}%`, "--burst-delay": `${burst * .18}s`, "--burst-color": ["#ffe58b", "#b8a0ff", "#8bffe1", "#ffade1"][burst] }}>
                    {Array.from({ length: 12 }, (_, ray) => <i key={ray} style={{ "--ray-angle": `${ray * 30}deg` }} />)}
                </div>)}
            </div>
            <div className="bingo-celebration-banner" role="status" aria-live="polite">
                <span className="bingo-banner-stars" aria-hidden="true">✦ ★ ✦</span>
                <strong>BINGO!</strong>
                <span>{banner.added > 1 ? `+${banner.added} đường cùng lúc!` : "Thêm một đường tuyệt đẹp!"}</span>
                <small>Đã hoàn thành {banner.total}/5 đường</small>
            </div>
        </div>, document.body)}
        <div className="bingo-board-grid" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
            {(size === 5 ? ["B", "I", "N", "G", "O"] : Array.from({ length: size }, (_, i) => i + 1)).map(letter =>
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
                    aria-label={`Số ${number}${completed.has(index) ? ", thuộc đường Bingo đã hoàn thành" : ""}`}
                    title={completed.has(index) ? `Số ${number} · Bingo!` : `Số ${number}`}
                    aria-pressed={canArrange ? selected === index : marked}
                >{completed.has(index) && icons[index]
                    ? <span className="bingo-cell-icon" aria-hidden="true">{icons[index]}</span>
                    : number}</button>;
            })}
        </div>
        {canArrange
            ? <p className="bingo-arrange-hint">Kéo ô số đến ô khác để đổi vị trí (hoặc chọn lần lượt 2 ô).</p>
            : <div className="bingo-board-legend"><span>⬛ Chưa gọi</span><span>🟪 Đã gọi</span><span>🟩 Đường Bingo</span></div>}
    </div>;
}
