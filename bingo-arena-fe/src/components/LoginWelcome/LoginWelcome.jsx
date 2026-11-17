import { useEffect, useRef } from "react";
import "./LoginWelcome.css";

export default function LoginWelcome({ username, onDone }) {
    const skip = useRef(null);
    useEffect(() => {
        skip.current?.focus();
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const timer = window.setTimeout(onDone, reduced ? 1000 : 3800);
        return () => window.clearTimeout(timer);
    }, [onDone]);

    return <div className="login-welcome" role="dialog" aria-modal="true" aria-label="Chào mừng đến Bingo Arena" onKeyDown={event => { if (event.key === "Escape") onDone(); }}>
        <div className="welcome-curtains" aria-hidden="true">
            <div className="welcome-curtain curtain-left" /><div className="welcome-curtain curtain-right" />
            <div className="welcome-valance" />
        </div>
        <div className="welcome-spotlights" aria-hidden="true"><i /><i /><i /></div>
        <div className="welcome-bulbs" aria-hidden="true">{Array.from({ length: 17 }, (_, i) => <i key={i} style={{ "--bulb-delay": `${i * -.17}s` }} />)}</div>
        <div className="welcome-fireworks" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => <div className="welcome-firework" key={i} style={{ "--fire-x": `${[15, 83, 29, 72, 9, 91][i]}%`, "--fire-y": `${[25, 32, 68, 73, 55, 14][i]}%`, "--fire-delay": `${.7 + i * .24}s`, "--fire-color": ["#ffe39b", "#bca0ff", "#8affda", "#ffaed9"][i % 4] }}>
                {Array.from({ length: 16 }, (_, j) => <i key={j} style={{ "--fire-angle": `${j * 22.5}deg` }} />)}
            </div>)}
        </div>
        <div className="welcome-message" role="status">
            <span className="welcome-kicker">✦ SÂN KHẤU ĐÃ SẴN SÀNG ✦</span>
            <h2>BINGO <span>ARENA</span></h2>
            <p>Chào mừng trở lại, <strong>{username || "người chơi"}</strong>!</p>
            <span className="welcome-tagline">Một ván mới. Một cơ hội tỏa sáng.</span>
        </div>
        <button type="button" ref={skip} className="welcome-skip" onClick={onDone}>Vào ngay <span aria-hidden="true">→</span></button>
    </div>;
}
