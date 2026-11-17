import { useCallback, useEffect, useRef, useState } from "react";
import "./RoomChat.css";

const labels = { laugh: "Cười vui", celebrate: "Ăn mừng", cry: "Khóc rồi", angry: "Giận dỗi", surprised: "Bất ngờ", cool: "Quá ngầu" };

export default function RoomChat({ messages, userId, connected, error, onSend }) {
    const [text, setText] = useState("");
    const [picker, setPicker] = useState(false);
    const [stickers, setStickers] = useState({});
    const [localError, setLocalError] = useState("");
    const [muted, setMuted] = useState(() => localStorage.getItem("bingo_chat_muted") === "true");
    const [soundBlocked, setSoundBlocked] = useState(false);
    const [unread, setUnread] = useState(0);
    const feed = useRef(null);
    const input = useRef(null);
    const audio = useRef(null);
    const heard = useRef(new Set(messages.map(message => message.id)));
    const nearBottom = useRef(true);
    const initialized = useRef(false);
    const lastMessageId = messages.at(-1)?.id;

    useEffect(() => {
        const controller = new AbortController();
        fetch(`${import.meta.env.BASE_URL}bingo-chat-assets/stickers.json`, { signal: controller.signal })
            .then(response => { if (!response.ok) throw new Error(); return response.json(); })
            .then(setStickers)
            .catch(error => { if (error.name !== "AbortError") setLocalError("Không tải được bộ sticker. Bạn vẫn có thể chat văn bản."); });
        return () => { controller.abort(); audio.current?.pause(); };
    }, []);

    const playSticker = useCallback((id) => {
        const sound = stickers[id]?.sound;
        if (!sound) return;
        audio.current?.pause();
        const player = new Audio(`${import.meta.env.BASE_URL}${sound.replace(/^\//, "")}`);
        player.volume = 0.5;
        audio.current = player;
        player.play().then(() => setSoundBlocked(false)).catch(() => setSoundBlocked(true));
    }, [stickers]);

    useEffect(() => {
        if (!Object.keys(stickers).length) return;
        const fresh = messages.filter(message => !heard.current.has(message.id));
        fresh.forEach(message => heard.current.add(message.id));
        const latest = fresh.filter(message => message.live && message.type === "STICKER").at(-1);
        if (latest && !muted) playSticker(latest.content);
    }, [messages, stickers, muted, playSticker]);

    useEffect(() => {
        if (!lastMessageId) return;
        if (nearBottom.current || !initialized.current) {
            if (feed.current) feed.current.scrollTop = feed.current.scrollHeight;
            setUnread(0);
        } else setUnread(value => value + 1);
        initialized.current = true;
    }, [lastMessageId]);

    function send(type, content) {
        try {
            setLocalError("");
            onSend(type, content);
            nearBottom.current = true;
            if (type === "TEXT") setText("");
            setPicker(false);
            input.current?.focus();
        } catch (error) { setLocalError(error.message); }
    }

    function toggleSound() {
        const next = !muted;
        setMuted(next);
        localStorage.setItem("bingo_chat_muted", String(next));
        if (next) audio.current?.pause();
        else playSticker("cool");
    }

    return <section className="room-chat" aria-label="Trò chuyện trong trận">
        <header className="room-chat-header">
            <div><span className="room-chat-eyebrow">CÙNG CHƠI · CÙNG VUI</span><h2>Trò chuyện <span className={connected ? "chat-online" : "chat-offline"} /></h2></div>
            <button type="button" className="chat-icon-button" onClick={toggleSound} aria-label={muted ? "Bật âm thanh sticker" : "Tắt âm thanh sticker"} aria-pressed={!muted} title={muted ? "Bật âm thanh" : "Tắt âm thanh"}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M11 4 6 8H3v8h3l5 4Z" />{muted ? <path d="m16 9 6 6m0-6-6 6" /> : <><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" /></>}</svg>
            </button>
        </header>
        <div className="room-chat-feed" ref={feed} role="log" aria-label="Tin nhắn" aria-live="polite" aria-relevant="additions" onScroll={() => {
            const el = feed.current;
            nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 55;
            if (nearBottom.current) setUnread(0);
        }}>
            {messages.length === 0 && <div className="chat-empty"><span>✦</span><h3>Chào một câu, vui cả trận!</h3><p>Gửi lời chúc may mắn hoặc thả một sticker có âm thanh cho đối thủ.</p></div>}
            {messages.map(message => {
                const mine = Number(message.userId) === Number(userId);
                return <article key={message.id} className={`chat-message ${mine ? "chat-mine" : ""}`}>
                    <div className="chat-message-meta"><span>{mine ? "Bạn" : message.displayName}</span><time dateTime={new Date(Number(message.createdAtMs)).toISOString()}>{new Date(Number(message.createdAtMs)).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</time></div>
                    {message.type === "STICKER" ? <button type="button" className="chat-sticker-message" onClick={() => playSticker(message.content)} aria-label={`Phát âm thanh: ${labels[message.content] || "Sticker"}`}>
                        {stickers[message.content] ? <img src={`${import.meta.env.BASE_URL}${stickers[message.content].image.replace(/^\//, "")}`} alt={labels[message.content] || "Sticker"} width="100" height="100" /> : <span>{labels[message.content] || "Sticker"}</span>}
                        <span>♫ Nhấn để nghe</span>
                    </button> : <p className="chat-bubble">{message.content}</p>}
                </article>;
            })}
        </div>
        {unread > 0 && <button type="button" className="chat-unread" onClick={() => { feed.current.scrollTop = feed.current.scrollHeight; nearBottom.current = true; setUnread(0); }}>{unread} tin nhắn mới ↓</button>}
        <div className="chat-compose-area">
            {soundBlocked && !muted && <button type="button" className="chat-sound-hint" onClick={() => playSticker("cool")}>♫ Nhấn để cho phép phát âm thanh sticker</button>}
            {(error || localError) && <p className="chat-error" role="alert">{localError || error}</p>}
            {picker && <div className="chat-sticker-picker" id="chat-sticker-picker">
                <div className="chat-picker-title"><span>STICKER CÓ ÂM THANH</span><button type="button" className="chat-icon-button" aria-label="Đóng bộ sticker" onClick={() => setPicker(false)}>×</button></div>
                <div className="chat-sticker-grid">{Object.keys(stickers).map(id => <button type="button" key={id} disabled={!connected} onClick={() => send("STICKER", id)} title={`Gửi ${labels[id]}`}><img src={`${import.meta.env.BASE_URL}${stickers[id].image.replace(/^\//, "")}`} alt={labels[id]} width="58" height="58" /><span>{labels[id]} ♫</span></button>)}</div>
                {!Object.keys(stickers).length && <p>Đang tải sticker...</p>}
            </div>}
            <form className="chat-composer" onSubmit={event => { event.preventDefault(); if (connected && text.trim()) send("TEXT", text.trim()); }}>
                <button type="button" className={`chat-icon-button chat-picker-toggle ${picker ? "active" : ""}`} onClick={() => setPicker(value => !value)} aria-label="Chọn sticker" aria-expanded={picker} aria-controls="chat-sticker-picker" title="Sticker có âm thanh">☺</button>
                <input ref={input} value={text} onChange={event => setText(event.target.value)} maxLength={500} disabled={!connected} placeholder={connected ? "Nhắn gì đó thật vui…" : "Đang chờ kết nối…"} aria-label="Nội dung tin nhắn" />
                <button type="submit" className="chat-send" disabled={!connected || !text.trim()} aria-label="Gửi tin nhắn"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m21 3-7 18-4-7-7-4 18-7ZM10 14 21 3" /></svg></button>
            </form>
            <div className="chat-compose-footer"><span>{connected ? "Enter để gửi · ☺ để thả sticker" : "Chat sẽ sẵn sàng khi kết nối lại"}</span><span>{text.length}/500</span></div>
        </div>
    </section>;
}
