import { useEffect, useRef, useState } from "react";

const ICONS = ["☁️", "🌙", "☀️", "⭐", "🌈", "✨", "🪐", "🌸"];

export default function useBingoCelebration(boardKey, lineKey, matchId) {
    const previous = useRef({ board: null, lines: new Set(), icons: {} });
    const matchIcon = useRef({ key: null, icon: null });
    const [icons, setIcons] = useState({});
    const [banner, setBanner] = useState(null);

    useEffect(() => {
        if (!boardKey) return;
        const iconKey = `bingo_match_icon_${matchId ?? boardKey}`;
        if (matchIcon.current.key !== iconKey) {
            let icon;
            try { icon = sessionStorage.getItem(iconKey); } catch { /* Use the in-memory selection when storage is unavailable. */ }
            if (!ICONS.includes(icon)) icon = ICONS[Math.floor(Math.random() * ICONS.length)];
            matchIcon.current = { key: iconKey, icon };
            try { sessionStorage.setItem(iconKey, icon); } catch { /* The icon remains stable for the mounted match. */ }
        }
        const lines = JSON.parse(lineKey);
        const reset = previous.current.board !== boardKey;
        if (reset) previous.current = { board: boardKey, lines: new Set(), icons: {} };
        const state = previous.current;
        const fresh = lines.filter(line => !state.lines.has(line.join(",")));
        for (const line of fresh) {
            state.lines.add(line.join(","));
            for (const index of line) state.icons[index] = matchIcon.current.icon;
        }
        if (reset) {
            // Restore completed cells without replaying old celebrations after a reload.
            setIcons({ ...state.icons });
            setBanner(null);
            return;
        }
        if (!fresh.length) return;
        setBanner({ id: lineKey, added: fresh.length, total: lines.length });
        const reveal = window.setTimeout(() => setIcons({ ...state.icons }), 1200);
        const hide = window.setTimeout(() => setBanner(null), 2600);
        return () => { window.clearTimeout(reveal); window.clearTimeout(hide); };
    }, [boardKey, lineKey, matchId]);

    return { icons, banner };
}
