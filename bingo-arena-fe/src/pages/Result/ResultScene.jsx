import "./ResultScene.css";

export default function ResultScene({ outcome }) {
    return <><div className={`result-scene scene-${outcome}`} aria-hidden="true">
        {outcome !== "lose" && <>
            <div className="scene-sun" />
            <div className="scene-cloud cloud-one" /><div className="scene-cloud cloud-two" /><div className="scene-cloud cloud-three" />
            <div className="scene-hill hill-back" /><div className="scene-hill hill-front" />
        </>}
        {outcome === "win" && <>
            <svg className="scene-rainbow" viewBox="0 0 1000 520" fill="none">
                {["#ff758f", "#ffac6d", "#ffe27d", "#83e7a6", "#7cd7ff", "#a597ff", "#e3a4f4"].map((color, i) =>
                    <path key={color} d={`M${65 + i * 24} 510a${435 - i * 24} ${435 - i * 24} 0 0 1 ${870 - i * 48} 0`} stroke={color} strokeWidth="22" />)}
            </svg>
            {Array.from({ length: 7 }, (_, i) => <div key={i} className="scene-firework" style={{ "--x": `${8 + (i * 37) % 86}%`, "--y": `${12 + (i * 19) % 49}%`, "--delay": `${i * -.67}s`, "--color": ["#ffe887", "#ff9cce", "#93f8ec", "#c2a0ff"][i % 4] }}>
                {Array.from({ length: 16 }, (_, j) => <i key={j} style={{ "--angle": `${j * 22.5}deg`, "--distance": `${66 + (j % 3) * 15}px` }} />)}
            </div>)}
            {Array.from({ length: 24 }, (_, i) => <i className="scene-confetti" key={i} style={{ "--left": `${(i * 43) % 100}%`, "--delay": `${i * -.43}s`, "--color": ["#ffd870", "#f892c4", "#87e7d0", "#ab9cff"][i % 4] }} />)}
        </>}
        {outcome === "lose" && <>
            <div className="storm-clouds" />
            <div className="storm-ground" />
        </>}
        {outcome === "draw" && <div className="scene-flock">
            {Array.from({ length: 9 }, (_, i) => <svg key={i} className="scene-bird" viewBox="0 0 48 24" style={{ "--bird-x": `${i * 42}px`, "--bird-y": `${Math.abs(i - 4) * 19}px`, "--flap-delay": `${i * -.12}s` }}>
                <g fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><path className="bird-left-wing" d="M24 18Q12 1 2 8" /><path className="bird-right-wing" d="M24 18Q36 1 46 8" /></g>
            </svg>)}
        </div>}
        <div className="scene-vignette" />
    </div>
        {outcome === "lose" && <div className="storm-weather" aria-hidden="true">
            <div className="storm-glow" />
            <svg className="scene-lightning lightning-one" viewBox="0 0 100 300"><path d="M62 0 15 140h37L28 300l66-184H57L88 0Z" fill="currentColor" /></svg>
            <svg className="scene-lightning lightning-two" viewBox="0 0 100 300"><path d="M62 0 15 140h37L28 300l66-184H57L88 0Z" fill="currentColor" /></svg>
            <div className="scene-rain">{Array.from({ length: 180 }, (_, i) => <i key={i} style={{ "--left": `${(i * 37.73) % 110}%`, "--rain-top": `${(i * 23.17) % 100}%`, "--delay": `${i * -.137}s`, "--duration": `${.42 + (i % 5) * .07}s`, "--opacity": .35 + (i % 4) * .15, "--rain-length": `${85 + (i % 5) * 16}px`, "--rain-width": `${i % 3 === 0 ? 2 : 1}px` }} />)}</div>
        </div>}
    </>;
}
