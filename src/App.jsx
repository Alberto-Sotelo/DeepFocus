import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Howl } from "howler";

// ─────────────────────────────────────────────────────────────
// ASSETS: Bootstrap Icons CDN + SF Pro font stack
// ─────────────────────────────────────────────────────────────
const injectAssets = () => {
  if (!document.getElementById("bi-css")) {
    const l = document.createElement("link");
    l.id = "bi-css"; l.rel = "stylesheet";
    l.href = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css";
    document.head.appendChild(l);
  }
  if (!document.getElementById("dw-base")) {
    const s = document.createElement("style"); s.id = "dw-base";
    s.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
      *{box-sizing:border-box;-webkit-font-smoothing:antialiased;}
      body{margin:0;overflow:hidden;background:#000;
        font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Inter',system-ui,sans-serif;}
      @keyframes blink{0%,100%{opacity:.5}50%{opacity:.1}}
      input[type=number]::-webkit-inner-spin-button{opacity:0;}
      ::placeholder{color:rgba(255,255,255,.22)!important;}
      .sa::-webkit-scrollbar{display:none;} .sa{scrollbar-width:none;}
      .sv{writing-mode:vertical-lr;direction:rtl;width:60px;height:100px;
          cursor:pointer;opacity:0;position:absolute;z-index:10;}
    `;
    document.head.appendChild(s);
  }
};

// ─────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────
const YOUTUBE_VIDEOS = [
  { id: "jfKfPfyJRdk", label: "Lofi Hip Hop" },
  { id: "4xDzrJKXOOY", label: "Radio Synthwave" },
  { id: "S_MOd40zlYU", label: "Dark Ambient" },
  { id: "IU-dnL1hJ1Q", label: "Elliot Room" },
  { id: "h4oxQo_8-HE", label: "Rainy Window" },
  { id: "V1bFr2SWP1I", label: "Fireplace 4K" },
];

const SOUND_TRACKS = {
  rain:    { label: "Lluvia",    icon: "bi-cloud-rain",      src: ["/sounds/rain.wav"]    },
  waves:   { label: "Olas",      icon: "bi-water",           src: ["/sounds/waves.wav"]   },
  fire:    { label: "Chimenea",  icon: "bi-fire",            src: ["/sounds/fire.wav"]    },
  office:  { label: "Oficina",   icon: "bi-building",        src: ["/sounds/office.wav"]  },
  wind:    { label: "Viento",    icon: "bi-wind",            src: ["/sounds/wind.wav"]    },
  cafe:    { label: "Café",      icon: "bi-cup-hot",         src: ["/sounds/cafe.wav"]    },
  birds:   { label: "Pájaros",   icon: "bi-feather",         src: ["/sounds/birds.wav"]   },
  thunder: { label: "Tormenta",  icon: "bi-cloud-lightning", src: ["/sounds/thunder.wav"] },
};

const PRESETS = [
  { label: "25/5",   work: 25, rest: 5  },
  { label: "50/10",  work: 50, rest: 10 },
  { label: "90/20",  work: 90, rest: 20 },
  { label: "Custom", work: 25, rest: 5, custom: true },
];

const ACCENT_COLORS = [
  { name: "Blanco",  value: "rgba(255,255,255,0.85)" },
  { name: "Violeta", value: "rgba(167,139,250,0.85)" },
  { name: "Rosa",    value: "rgba(244,114,182,0.85)" },
  { name: "Cyan",    value: "rgba(34,211,238,0.85)"  },
  { name: "Verde",   value: "rgba(74,222,128,0.85)"  },
  { name: "Naranja", value: "rgba(251,146,60,0.85)"  },
];

const QUOTES = [
  { text: "El enfoque es la nueva IQ.", author: "Cal Newport" },
  { text: "Haz una cosa. Hazla bien.", author: "" },
  { text: "La distracción es el enemigo del progreso.", author: "" },
  { text: "El trabajo profundo es una superpotencia.", author: "Cal Newport" },
  { text: "Pequeños actos de concentración crean grandes resultados.", author: "" },
  { text: "La mente que se dispersa no crea nada.", author: "" },
  { text: "El presente es el único tiempo en que puedes actuar.", author: "" },
  { text: "Elige tu foco con cuidado — de eso está hecha tu vida.", author: "" },
];

// Fases de respiración: empieza siempre en Inhala
const BREATH = [
  { label: "Inhala",  dur: 4000, scale: 1.5,  ring: 0.75 },
  { label: "Retén",   dur: 4000, scale: 1.0,  ring: 0.45 },
  { label: "Exhala",  dur: 6000, scale: 0.5,  ring: 0.2  },
  { label: "Retén",   dur: 2000, scale: 0.5,  ring: 0.15 },
];

// ─────────────────────────────────────────────────────────────
// STORAGE HELPERS
// ─────────────────────────────────────────────────────────────
const ls = {
  get: (k, d = null) => { try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const todayKey  = () => new Date().toISOString().split("T")[0];
const weekKey   = () => { const d = new Date(), day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1); return new Date(d.setDate(diff)).toISOString().split("T")[0]; };
const monthKey  = () => new Date().toISOString().slice(0, 7);
const fmtMin    = (m) => m < 60 ? `${m}m` : `${Math.floor(m/60)}h ${m%60}m`;
const dayQuote  = () => QUOTES[new Date().getDate() % QUOTES.length];
const greet     = () => { const h = new Date().getHours(); return h < 12 ? "Buenos días" : h < 18 ? "Buenas tardes" : "Buenas noches"; };

function addFocusMins(mins) {
  const s = ls.get("dw_stats", {});
  s[todayKey()] = (s[todayKey()] || 0) + mins;
  s[`w_${weekKey()}`]  = (s[`w_${weekKey()}`]  || 0) + mins;
  s[`m_${monthKey()}`] = (s[`m_${monthKey()}`] || 0) + mins;
  ls.set("dw_stats", s); return s;
}

// ─────────────────────────────────────────────────────────────
// HOOK: SOUND MIXER
// ─────────────────────────────────────────────────────────────
function useSoundMixer() {
  const howls = useRef({});
  const [vols, setVols] = useState(Object.fromEntries(Object.keys(SOUND_TRACKS).map((k) => [k, 0])));
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    Object.entries(SOUND_TRACKS).forEach(([k, t]) => {
      howls.current[k] = new Howl({ src: t.src, loop: true, volume: 0, html5: true });
    });
    return () => Object.values(howls.current).forEach((h) => h.unload());
  }, []);

  const setVol = useCallback((key, val) => {
    const h = howls.current[key]; if (!h) return;
    const v = val / 100;
    if (v > 0) { if (!h.playing()) h.play(); h.volume(v); }
    else { h.fade(h.volume(), 0, 400); setTimeout(() => { if (h.volume() < 0.01) h.pause(); }, 450); }
    setVols((p) => ({ ...p, [key]: val }));
  }, []);

  const togglePause = useCallback(() => setPaused((p) => {
    const next = !p;
    Object.values(howls.current).forEach((h) => next ? h.pause() : (h.volume() > 0 && h.play()));
    return next;
  }), []);

  const stopAll = useCallback(() => {
    Object.values(howls.current).forEach((h) => { h.fade(h.volume(), 0, 500); setTimeout(() => h.pause(), 550); });
    setVols(Object.fromEntries(Object.keys(SOUND_TRACKS).map((k) => [k, 0])));
  }, []);

  return { vols, setVol, paused, togglePause, stopAll };
}

// ─────────────────────────────────────────────────────────────
// HOOK: POMODORO — bug fix completo
// PROBLEMA ANTERIOR: setSeconds devolvía 0 y luego setIsWork / setRunning
// dentro del closure del interval estaban desactualizados → el descanso
// no arrancaba, pausar reiniciaba el tiempo.
// SOLUCIÓN: refs para isWork, work y rest. setTimeout(0) para cambios de
// fase fuera del reducer. Pausar = solo setRunning(false), sin tocar seconds.
// ─────────────────────────────────────────────────────────────
function usePomodoro(onComplete) {
  const [preset, setPreset]   = useState(PRESETS[0]);
  const [cw, setCw]           = useState(25); // custom work mins
  const [cr, setCr]           = useState(5);  // custom rest mins
  const [running, setRunning] = useState(false);
  const [isWork, setIsWork]   = useState(true);
  const [secs, setSecs]       = useState(PRESETS[0].work * 60);
  const [sessions, setSess]   = useState(0);
  const [total, setTotal]     = useState(() => ls.get("dw_stats", {})[todayKey()] || 0);

  // Refs — siempre tienen el valor actual dentro de los closures
  const isWorkRef = useRef(true);
  const workRef   = useRef(PRESETS[0].work);
  const restRef   = useRef(PRESETS[0].rest);

  const ew = preset.custom ? cw : preset.work;
  const er = preset.custom ? cr : preset.rest;

  useEffect(() => { isWorkRef.current = isWork; },  [isWork]);
  useEffect(() => { workRef.current   = ew; },      [ew]);
  useEffect(() => { restRef.current   = er; },      [er]);

  // INTERVAL PRINCIPAL — sólo depende de `running`
  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => {
      setSecs((prev) => {
        if (prev <= 1) {
          // Llegamos a 0 — usamos refs para saber qué fase era
          const wasWork = isWorkRef.current;
          clearInterval(iv);
          // Fuera del ciclo de reducción: actualizar fase y duración
          setTimeout(() => {
            const nextWork = !wasWork;
            if (wasWork) {
              const stats = addFocusMins(workRef.current);
              setTotal(stats[todayKey()] || 0);
              setSess((c) => c + 1);
            }
            onComplete(wasWork);
            setIsWork(nextWork);
            setSecs(nextWork ? workRef.current * 60 : restRef.current * 60);
            setRunning(false); // auto-stop, usuario decide iniciar el descanso
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [running, onComplete]); // ← SIN isWork/ew/er en deps

  const toggleRun = useCallback(() => setRunning((r) => !r), []);

  const reset = useCallback(() => {
    setRunning(false);
    setIsWork(true);
    setSecs(workRef.current * 60);
  }, []);

  const changePreset = useCallback((p) => {
    setPreset(p);
    setRunning(false);
    setIsWork(true);
    setSecs((p.custom ? cw : p.work) * 60);
  }, [cw]);

  const min = Math.floor(secs / 60);
  const sec = secs % 60;
  const display = `${String(min).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  const totalSecs = (isWork ? ew : er) * 60;
  const progress = totalSecs > 0 ? Math.max(0, 1 - secs / totalSecs) : 0;

  return { display, progress, running, isWork, sessions, total, preset, cw, cr, toggleRun, reset, changePreset, setCw, setCr };
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE: VIDEO BACKGROUND
// ─────────────────────────────────────────────────────────────
function VideoBg({ videoId, customBg, muted }) {
  const playerRef = useRef(null);
  const divRef    = useRef(null);
  const ready     = useRef(false);

  useEffect(() => {
    if (customBg) return;
    const init = () => {
      if (!divRef.current) return;
      try { playerRef.current?.destroy(); } catch (_) {}
      playerRef.current = new window.YT.Player(divRef.current, {
        videoId,
        playerVars: { autoplay:1, controls:0, loop:1, playlist:videoId, mute:1, modestbranding:1, playsinline:1, rel:0, fs:0 },
        events: { onReady: (e) => { e.target.playVideo(); ready.current = true; } },
      });
    };
    if (window.YT?.Player) { init(); }
    else {
      window.onYouTubeIframeAPIReady = init;
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const s = document.createElement("script");
        s.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(s);
      }
    }
    return () => { try { playerRef.current?.destroy(); } catch (_) {} ready.current = false; };
  }, [videoId, customBg]);

  useEffect(() => {
    if (!ready.current || !playerRef.current || customBg) return;
    try { muted ? playerRef.current.mute() : playerRef.current.unMute(); } catch (_) {}
  }, [muted, customBg]);

  const overlay = <>
    <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.45)", zIndex:2 }} />
    <div style={{ position:"absolute", inset:0, zIndex:3, background:"linear-gradient(to bottom,rgba(0,0,0,.2),transparent,rgba(0,0,0,.5))" }} />
  </>;

  if (customBg) return (
    <div style={{ position:"fixed", inset:0, zIndex:-1, backgroundImage:`url(${customBg})`, backgroundSize:"cover", backgroundPosition:"center" }}>
      {overlay}
    </div>
  );

  return (
    <div style={{ position:"fixed", inset:0, zIndex:-1, overflow:"hidden", background:"#000", pointerEvents:"none" }}>
      {overlay}
      <div ref={divRef} style={{ position:"absolute", top:"50%", left:"50%",
        transform:"translate(-50%,-50%)", width:"calc(100vh * 1.778)", minWidth:"100vw",
        height:"calc(100vw * .5625)", minHeight:"100vh", zIndex:1 }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE: CONFETTI
// ─────────────────────────────────────────────────────────────
function Confetti({ active }) {
  if (!active) return null;
  const p = Array.from({ length: 36 }, (_, i) => ({
    id: i, x: Math.random() * 100,
    color: ["#a78bfa","#f472b6","#34d399","#fbbf24","#60a5fa"][i % 5],
    delay: Math.random() * 0.4, dur: 1.4 + Math.random(), size: 5 + Math.random() * 7,
    round: Math.random() > 0.5,
  }));
  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:50, overflow:"hidden" }}>
      {p.map((x) => (
        <motion.div key={x.id}
          initial={{ x:`${x.x}vw`, y:"-5vh", rotate:0, opacity:1 }}
          animate={{ y:"110vh", rotate:720, opacity:0 }}
          transition={{ duration:x.dur, delay:x.delay, ease:"easeIn" }}
          style={{ position:"absolute", width:x.size, height:x.size, background:x.color, borderRadius:x.round?"50%":"2px" }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE: TOAST
// ─────────────────────────────────────────────────────────────
function Toast({ message, icon, onDismiss }) {
  useEffect(() => { const t = setTimeout(onDismiss, 4500); return () => clearTimeout(t); }, [onDismiss]);
  return (
    <motion.div initial={{ opacity:0, y:-36, scale:0.9 }} animate={{ opacity:1, y:0, scale:1 }}
      exit={{ opacity:0, y:-20 }} transition={{ type:"spring", stiffness:320, damping:28 }}
      style={{ position:"fixed", top:24, left:"50%", transform:"translateX(-50%)", zIndex:99 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 22px", borderRadius:22,
        background:"rgba(255,255,255,0.11)", backdropFilter:"blur(28px)",
        border:"1px solid rgba(255,255,255,0.18)", boxShadow:"0 8px 32px rgba(0,0,0,0.35)",
        color:"white", fontSize:13.5, fontWeight:500, letterSpacing:"0.01em" }}>
        <i className={`bi ${icon}`} style={{ fontSize:17 }} />
        <span>{message}</span>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE: LIVE CLOCK
// ─────────────────────────────────────────────────────────────
function LiveClock({ userName, accent }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const iv = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(iv); }, []);
  const H = String(time.getHours()).padStart(2,"0");
  const M = String(time.getMinutes()).padStart(2,"0");
  const S = String(time.getSeconds()).padStart(2,"0");
  return (
    <div style={{ textAlign:"center" }}>
      <div style={{ fontSize:"clamp(52px,8vw,90px)", fontWeight:200, color:accent,
        letterSpacing:"0.04em", lineHeight:1, fontVariantNumeric:"tabular-nums",
        textShadow:`0 0 48px ${accent.replace("0.85","0.25")}` }}>
        {H}<span style={{ opacity:0.45, animation:"blink 1s step-end infinite" }}>:</span>{M}
        <span style={{ fontSize:"38%", opacity:0.32, marginLeft:6 }}>{S}</span>
      </div>
      <div style={{ color:"rgba(255,255,255,0.42)", fontSize:13.5, marginTop:7, fontWeight:300, letterSpacing:"0.04em" }}>
        {greet()}{userName ? `, ${userName}` : ""} · {time.toLocaleDateString("es-MX", { weekday:"long", day:"numeric", month:"long" })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE: BREATHING GUIDE
// CORRECCIÓN: empieza siempre en fase 0 (Inhala) al activar.
// El ciclo avanza al completar cada duración usando setTimeout.
// Pausar detiene el timeout sin perder la fase actual.
// ─────────────────────────────────────────────────────────────
function BreathingGuide({ accent }) {
  const [active, setActive]     = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0); // 0 = Inhala siempre al iniciar
  const timerRef = useRef(null);

  const phase = BREATH[phaseIdx];

  // Avance de fase: se activa cuando `active` es true
  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!active) return;
    // Esperar la duración de la fase actual → pasar a la siguiente
    timerRef.current = setTimeout(() => {
      setPhaseIdx((i) => (i + 1) % BREATH.length);
    }, phase.dur);
    return () => clearTimeout(timerRef.current);
  }, [active, phaseIdx]); // re-run cuando cambia la fase (para encadenar)

  const toggle = () => {
    if (!active) setPhaseIdx(0); // siempre empieza en "Inhala"
    setActive((a) => !a);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:7 }}>
      <button onClick={toggle} title={active ? "Pausar" : "Iniciar respiración guiada"}
        style={{ background:"transparent", border:"none", cursor:"pointer", padding:0 }}>
        <div style={{ position:"relative", width:64, height:64, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <motion.div
            animate={{ scale: active ? phase.ring * 2.2 : 1, opacity: active ? phase.ring : 0.14 }}
            transition={{ duration: phase.dur / 1000, ease:"easeInOut" }}
            style={{ position:"absolute", inset:0, borderRadius:"50%", border:`1px solid ${accent.replace("0.85","0.5")}` }}
          />
          <motion.div
            animate={{ scale: active ? phase.scale : 0.6 }}
            transition={{ duration: phase.dur / 1000, ease:"easeInOut" }}
            style={{ width:30, height:30, borderRadius:"50%",
              background: accent.replace("0.85", active ? "0.16" : "0.06"),
              border:`1.5px solid ${accent.replace("0.85","0.45")}`,
              backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            {!active && <i className="bi bi-play-fill" style={{ color:"rgba(255,255,255,0.5)", fontSize:11, marginLeft:2 }} />}
          </motion.div>
        </div>
      </button>
      <motion.span key={`${active}-${phaseIdx}`} initial={{ opacity:0 }} animate={{ opacity:0.45 }}
        style={{ color:"white", fontSize:9, letterSpacing:"0.15em", textTransform:"uppercase", fontWeight:500 }}>
        {active ? phase.label : "Respirar"}
      </motion.span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE: POMODORO TIMER
// ─────────────────────────────────────────────────────────────
function PomodoroTimer({ timer, accent, showProgress }) {
  const { display, progress, running, isWork, sessions, total,
    preset, cw, cr, toggleRun, reset, changePreset, setCw, setCr } = timer;
  const [showCustom, setShowCustom] = useState(false);
  const C = 2 * Math.PI * 54;

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16,
      padding:"22px 26px", borderRadius:26,
      background:"rgba(255,255,255,0.06)", backdropFilter:"blur(28px)",
      border:"1px solid rgba(255,255,255,0.1)", boxShadow:"0 8px 40px rgba(0,0,0,0.22)", minWidth:244 }}>

      {/* Presets */}
      <div style={{ display:"flex", gap:5, flexWrap:"wrap", justifyContent:"center" }}>
        {PRESETS.map((p) => (
          <button key={p.label}
            onClick={() => { changePreset(p); setShowCustom(!!p.custom); }}
            style={{ padding:"3px 12px", borderRadius:20, fontSize:11, cursor:"pointer",
              border:`1px solid ${preset.label===p.label ? accent : "rgba(255,255,255,0.14)"}`,
              background: preset.label===p.label ? accent.replace("0.85","0.15") : "transparent",
              color: preset.label===p.label ? "white" : "rgba(255,255,255,0.4)",
              fontWeight: preset.label===p.label ? 500 : 400, transition:"all 0.2s" }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom inputs */}
      <AnimatePresence>
        {showCustom && (
          <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }}
            style={{ display:"flex", gap:12, overflow:"hidden" }}>
            {[{ label:"Trabajo", val:cw, set:setCw },{ label:"Descanso", val:cr, set:setCr }].map(({ label, val, set }) => (
              <div key={label} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <span style={{ color:"rgba(255,255,255,0.35)", fontSize:9, letterSpacing:"0.1em", textTransform:"uppercase" }}>{label}</span>
                <input type="number" min="1" max="180" value={val}
                  onChange={(e) => { set(Number(e.target.value)); reset(); }}
                  style={{ width:52, textAlign:"center", padding:"4px 0",
                    background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.18)",
                    borderRadius:8, color:"white", fontSize:14, outline:"none" }} />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reloj SVG */}
      <div style={{ position:"relative" }}>
        <svg width="150" height="150" style={{ transform:"rotate(-90deg)" }}>
          <circle cx="75" cy="75" r="54" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3.5" />
          <motion.circle cx="75" cy="75" r="54" fill="none"
            stroke={isWork ? accent.replace("0.85","0.8") : "rgba(110,231,183,0.8)"}
            strokeWidth="3.5" strokeLinecap="round" strokeDasharray={C}
            animate={{ strokeDashoffset: C * (1 - progress) }}
            transition={{ duration:0.85, ease:"linear" }} />
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <span style={{ color:"white", fontSize:31, fontWeight:300, letterSpacing:"0.06em", fontVariantNumeric:"tabular-nums" }}>
            {display}
          </span>
          <span style={{ fontSize:9, letterSpacing:"0.15em", marginTop:3, textTransform:"uppercase", fontWeight:500,
            color: isWork ? "rgba(255,255,255,0.4)" : "rgba(110,231,183,0.75)" }}>
            {isWork ? "Enfoque" : "Descanso"}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div style={{ width:"100%", height:2.5, borderRadius:2, background:"rgba(255,255,255,0.07)", overflow:"hidden" }}>
          <motion.div animate={{ width:`${progress*100}%` }} transition={{ duration:0.85, ease:"linear" }}
            style={{ height:"100%", borderRadius:2, background: isWork ? accent : "rgba(110,231,183,0.8)" }} />
        </div>
      )}

      {/* Controles */}
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <button onClick={reset}
          style={{ width:36, height:36, borderRadius:"50%", border:"1px solid rgba(255,255,255,0.12)",
            background:"transparent", color:"rgba(255,255,255,0.4)", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, transition:"all 0.18s" }}>
          <i className="bi bi-arrow-counterclockwise" />
        </button>
        <button onClick={toggleRun}
          style={{ padding:"9px 30px", borderRadius:22,
            border:`1.5px solid ${accent.replace("0.85","0.45")}`,
            background:accent.replace("0.85","0.16"), color:"white",
            fontSize:13, fontWeight:500, cursor:"pointer", letterSpacing:"0.03em",
            display:"flex", alignItems:"center", gap:7, transition:"all 0.18s" }}>
          <i className={`bi ${running ? "bi-pause-fill" : "bi-play-fill"}`} />
          {running ? "Pausar" : "Iniciar"}
        </button>
      </div>

      {/* Stats rápidos */}
      <div style={{ display:"flex", gap:20, alignItems:"center" }}>
        {[{ label:"Sesiones", val:sessions },{ label:"Hoy", val:fmtMin(total) }].map(({ label, val }, i) => (
          <div key={label} style={{ display:"flex", gap:20, alignItems:"center" }}>
            {i > 0 && <div style={{ width:1, height:26, background:"rgba(255,255,255,0.1)" }} />}
            <div style={{ textAlign:"center" }}>
              <div style={{ color:"rgba(255,255,255,0.28)", fontSize:9, letterSpacing:"0.12em", textTransform:"uppercase", fontWeight:500 }}>{label}</div>
              <div style={{ color:"white", fontSize:19, fontWeight:300 }}>{val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Puntos de sesión */}
      <div style={{ display:"flex", gap:5 }}>
        {Array.from({ length:8 }).map((_,i) => (
          <motion.div key={i}
            animate={{ scale:i<sessions%8?1.15:1, background:i<sessions%8?accent:"rgba(255,255,255,0.12)" }}
            style={{ width:5, height:5, borderRadius:"50%" }} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE: SOUND MIXER
// ─────────────────────────────────────────────────────────────
function SoundMixer({ vols, setVol, paused, togglePause, stopAll, accent }) {
  return (
    <div style={{ padding:"20px 22px", borderRadius:26,
      background:"rgba(255,255,255,0.06)", backdropFilter:"blur(28px)",
      border:"1px solid rgba(255,255,255,0.1)", boxShadow:"0 8px 40px rgba(0,0,0,0.22)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <span style={{ color:"rgba(255,255,255,0.45)", fontSize:10, letterSpacing:"0.15em", textTransform:"uppercase", fontWeight:600 }}>
          Paisajes Sonoros
        </span>
        <div style={{ display:"flex", gap:6 }}>
          {[{ icon:"bi-x-circle", label:"Limpiar", action:stopAll, active:false },
            { icon:paused?"bi-play-fill":"bi-pause-fill", label:paused?"Reanudar":"Pausa", action:togglePause, active:paused }
          ].map(({ icon, label, action, active: a }) => (
            <button key={label} onClick={action}
              style={{ padding:"3px 10px", borderRadius:20, cursor:"pointer", fontSize:10,
                border:`1px solid ${a ? accent : "rgba(255,255,255,0.14)"}`,
                background: a ? accent.replace("0.85","0.15") : "transparent",
                color: a ? "white" : "rgba(255,255,255,0.42)",
                display:"flex", alignItems:"center", gap:5 }}>
              <i className={`bi ${icon}`} /> {label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
        {Object.entries(SOUND_TRACKS).map(([key, track]) => (
          <div key={key} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
            <div style={{ position:"relative", height:100, display:"flex", alignItems:"flex-end" }}>
              <div style={{ position:"absolute", bottom:0, left:"50%", transform:"translateX(-50%)",
                width:4, height:100, borderRadius:2, background:"rgba(255,255,255,0.09)", overflow:"hidden" }}>
                <motion.div animate={{ height:`${vols[key]}%` }} transition={{ duration:0.12 }}
                  style={{ position:"absolute", bottom:0, width:"100%", borderRadius:2,
                    background: vols[key]>0 ? accent : "rgba(255,255,255,0.18)" }} />
              </div>
              <input type="range" min="0" max="100" value={vols[key]}
                onChange={(e) => setVol(key, Number(e.target.value))}
                className="sv" />
            </div>
            <i className={`bi ${track.icon}`}
              style={{ color: vols[key]>0 ? accent : "rgba(255,255,255,0.4)", fontSize:17, transition:"color 0.2s" }} />
            <span style={{ color:"rgba(255,255,255,0.38)", fontSize:9, letterSpacing:"0.06em", fontWeight:500 }}>
              {track.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE: FOCUS STATS
// ─────────────────────────────────────────────────────────────
function FocusStats({ accent }) {
  const [view, setView] = useState("día");
  const stats = ls.get("dw_stats", {});

  const data = (() => {
    if (view === "día") return Array.from({ length:7 }, (_,i) => {
      const d = new Date(); d.setDate(d.getDate()-(6-i));
      return { label:d.toLocaleDateString("es-MX",{weekday:"short"}), min:stats[d.toISOString().split("T")[0]]||0 };
    });
    if (view === "semana") return Array.from({ length:4 }, (_,i) => {
      const d = new Date(); d.setDate(d.getDate()-(3-i)*7);
      const day=d.getDay(); d.setDate(d.getDate()-day+(day===0?-6:1));
      return { label:`S${i+1}`, min:stats[`w_${d.toISOString().split("T")[0]}`]||0 };
    });
    return Array.from({ length:6 }, (_,i) => {
      const d = new Date(); d.setMonth(d.getMonth()-(5-i));
      return { label:d.toLocaleDateString("es-MX",{month:"short"}), min:stats[`m_${d.toISOString().slice(0,7)}`]||0 };
    });
  })();

  const maxM  = Math.max(...data.map((d) => d.min), 1);
  const total = data.reduce((a,d) => a+d.min, 0);

  return (
    <div style={{ padding:"20px 22px", borderRadius:26, background:"rgba(255,255,255,0.06)",
      backdropFilter:"blur(28px)", border:"1px solid rgba(255,255,255,0.1)",
      boxShadow:"0 8px 40px rgba(0,0,0,0.22)", minWidth:284 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <span style={{ color:"rgba(255,255,255,0.45)", fontSize:10, letterSpacing:"0.15em", textTransform:"uppercase", fontWeight:600 }}>
          Estadísticas
        </span>
        <div style={{ display:"flex", gap:4 }}>
          {["día","semana","mes"].map((v) => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding:"2px 9px", borderRadius:20, cursor:"pointer", fontSize:10,
                border:`1px solid ${view===v ? accent : "rgba(255,255,255,0.12)"}`,
                background: view===v ? accent.replace("0.85","0.15") : "transparent",
                color: view===v ? "white" : "rgba(255,255,255,0.35)",
                fontWeight: view===v ? 500 : 400 }}>
              {v}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:80, marginBottom:10 }}>
        {data.map((d,i) => (
          <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center" }}>
            <motion.div initial={{ height:0 }} animate={{ height:`${(d.min/maxM)*72}px` }}
              transition={{ duration:0.45, delay:i*0.04 }}
              style={{ width:"100%", borderRadius:"3px 3px 0 0", minHeight:3,
                background: d.min===Math.max(...data.map((x)=>x.min))&&d.min>0
                  ? accent.replace("0.85","0.8") : d.min>0
                  ? accent.replace("0.85","0.4") : "rgba(255,255,255,0.07)" }} />
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:12 }}>
        {data.map((d,i) => <div key={i} style={{ flex:1, textAlign:"center", color:"rgba(255,255,255,0.28)", fontSize:8, fontWeight:500 }}>{d.label}</div>)}
      </div>
      <div style={{ padding:"9px 14px", borderRadius:12, background:"rgba(255,255,255,0.04)",
        border:"1px solid rgba(255,255,255,0.07)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ color:"rgba(255,255,255,0.32)", fontSize:11 }}>Total período</span>
        <span style={{ color:"white", fontSize:15, fontWeight:300 }}>{fmtMin(total)}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE: TASK LIST
// Edición inline, textarea con saltos de línea, editar duración
// ─────────────────────────────────────────────────────────────
function TaskList({ accent }) {
  const [tasks, setTasks]   = useState(() => ls.get("dw_tasks", []));
  const [input, setInput]   = useState("");
  const [dur, setDur]       = useState("");
  const [editId, setEditId] = useState(null);
  const [eText, setEText]   = useState("");
  const [eDur, setEDur]     = useState("");
  const [showDone, setSD]   = useState(false);
  const inputRef = useRef(null);

  const persist = (t) => { setTasks(t); ls.set("dw_tasks", t); };
  const add = () => {
    const text = input.trim(); if (!text) return;
    persist([{ id:Date.now(), text, done:false, duration:dur?Number(dur):null }, ...tasks]);
    setInput(""); setDur(""); inputRef.current?.focus();
  };
  const toggle    = (id) => persist(tasks.map((t) => t.id===id ? { ...t, done:!t.done } : t));
  const remove    = (id) => persist(tasks.filter((t) => t.id!==id));
  const clearDone = ()   => persist(tasks.filter((t) => !t.done));
  const startEdit = (t)  => { setEditId(t.id); setEText(t.text); setEDur(t.duration?String(t.duration):""); };
  const saveEdit  = ()   => {
    persist(tasks.map((t) => t.id===editId ? { ...t, text:eText.trim()||t.text, duration:eDur?Number(eDur):null } : t));
    setEditId(null);
  };

  const pending = tasks.filter((t) => !t.done);
  const done    = tasks.filter((t) => t.done);
  const eta     = pending.reduce((a,t) => a+(t.duration||0), 0);

  const gi = { // glass input style
    background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
    borderRadius:12, color:"white", outline:"none", fontSize:12, padding:"7px 11px", fontFamily:"inherit",
  };

  return (
    <div style={{ padding:"20px 22px", borderRadius:26, background:"rgba(255,255,255,0.06)",
      backdropFilter:"blur(28px)", border:"1px solid rgba(255,255,255,0.1)",
      boxShadow:"0 8px 40px rgba(0,0,0,0.22)", width:312 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:13 }}>
        <span style={{ color:"rgba(255,255,255,0.45)", fontSize:10, letterSpacing:"0.15em", textTransform:"uppercase", fontWeight:600 }}>Tareas</span>
        <span style={{ color:"rgba(255,255,255,0.22)", fontSize:10 }}>
          {pending.length} pendientes{eta>0?` · ETA ${fmtMin(eta)}`:""}
        </span>
      </div>

      {/* Input nueva tarea — textarea para saltos de línea */}
      <div style={{ display:"flex", gap:5, marginBottom:12 }}>
        <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} rows={1}
          onKeyDown={(e) => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); add(); } }}
          placeholder="Nueva tarea… Shift+↵ para salto"
          className="sa"
          style={{ ...gi, flex:1, resize:"none", lineHeight:1.5, minHeight:34, maxHeight:88, overflowY:"auto" }}
        />
        <input type="number" min="1" value={dur} onChange={(e) => setDur(e.target.value)} placeholder="min"
          style={{ ...gi, width:44, textAlign:"center", padding:"7px 4px", color:"rgba(255,255,255,0.55)" }} />
        <button onClick={add}
          style={{ width:34, height:34, borderRadius:10, cursor:"pointer",
            background:accent.replace("0.85","0.2"), border:`1px solid ${accent.replace("0.85","0.4")}`,
            color:"white", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <i className="bi bi-plus" />
        </button>
      </div>

      {/* Lista de pendientes */}
      <div style={{ maxHeight:220, overflowY:"auto" }} className="sa">
        <AnimatePresence>
          {pending.map((task) => (
            <motion.div key={task.id} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
              exit={{ opacity:0, x:10 }}
              style={{ borderBottom:"1px solid rgba(255,255,255,0.05)", paddingBottom:4, marginBottom:4 }}>

              {editId === task.id ? (
                <div style={{ display:"flex", flexDirection:"column", gap:5, paddingTop:4 }}>
                  <textarea value={eText} onChange={(e) => setEText(e.target.value)} rows={2} autoFocus
                    onKeyDown={(e) => { if (e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); saveEdit(); } }}
                    className="sa"
                    style={{ ...gi, resize:"none", lineHeight:1.5, minHeight:36, width:"100%", boxSizing:"border-box" }}
                  />
                  <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                    <input type="number" min="1" value={eDur} onChange={(e) => setEDur(e.target.value)} placeholder="min"
                      style={{ ...gi, width:52, textAlign:"center", padding:"4px 6px", fontSize:11 }} />
                    <button onClick={saveEdit}
                      style={{ padding:"3px 10px", borderRadius:10, fontSize:11, cursor:"pointer",
                        background:accent.replace("0.85","0.2"), border:`1px solid ${accent.replace("0.85","0.4")}`,
                        color:"white", display:"flex", alignItems:"center", gap:4 }}>
                      <i className="bi bi-check2" /> Guardar
                    </button>
                    <button onClick={() => setEditId(null)}
                      style={{ padding:"3px 8px", borderRadius:10, fontSize:11, cursor:"pointer",
                        background:"transparent", border:"1px solid rgba(255,255,255,0.12)",
                        color:"rgba(255,255,255,0.35)" }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"5px 0" }}>
                  <button onClick={() => toggle(task.id)}
                    style={{ width:17, height:17, borderRadius:5, flexShrink:0, marginTop:2,
                      border:"1.5px solid rgba(255,255,255,0.28)", background:"transparent",
                      cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }} />
                  <span onClick={() => startEdit(task)} title="Clic para editar"
                    style={{ flex:1, color:"rgba(255,255,255,0.75)", fontSize:12.5, lineHeight:1.55,
                      cursor:"pointer", whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
                    {task.text}
                  </span>
                  {task.duration && (
                    <span style={{ color:"rgba(255,255,255,0.22)", fontSize:10, flexShrink:0 }}>{task.duration}m</span>
                  )}
                  <button onClick={() => remove(task.id)}
                    style={{ background:"transparent", border:"none", color:"rgba(255,255,255,0.18)",
                      cursor:"pointer", fontSize:14, padding:0, flexShrink:0 }}>
                    <i className="bi bi-x" />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Completadas */}
      {done.length > 0 && (
        <div>
          <button onClick={() => setSD((v) => !v)}
            style={{ background:"transparent", border:"none", color:"rgba(255,255,255,0.22)",
              fontSize:10, cursor:"pointer", padding:"7px 0 3px", display:"flex", alignItems:"center", gap:5 }}>
            <i className={`bi bi-chevron-${showDone?"down":"right"}`} style={{ fontSize:9 }} />
            {done.length} completadas
          </button>
          <AnimatePresence>
            {showDone && (
              <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }}>
                {done.slice(0,6).map((t) => (
                  <div key={t.id} style={{ display:"flex", alignItems:"flex-start", gap:7, padding:"3px 0" }}>
                    <i className="bi bi-check2" style={{ color:accent, fontSize:12, marginTop:1 }} />
                    <span style={{ flex:1, color:"rgba(255,255,255,0.28)", fontSize:11.5,
                      textDecoration:"line-through", whiteSpace:"pre-wrap" }}>{t.text}</span>
                    <button onClick={() => remove(t.id)}
                      style={{ background:"transparent", border:"none", color:"rgba(255,255,255,0.15)",
                        cursor:"pointer", fontSize:14, padding:0 }}>
                      <i className="bi bi-x" />
                    </button>
                  </div>
                ))}
                <button onClick={clearDone}
                  style={{ background:"transparent", border:"none", color:"rgba(255,255,255,0.2)",
                    fontSize:10, cursor:"pointer", padding:"4px 0" }}>
                  Limpiar completadas
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE: NOTEPAD
// CORRECCIÓN: ls.get devuelve "" si el valor es null/vacío.
// El texto se guarda en cada keystroke. Al re-abrir la app
// recupera el valor desde localStorage correctamente.
// ─────────────────────────────────────────────────────────────
function Notepad({ accent }) {
  // Carga inicial desde localStorage — ls.get devuelve "" como fallback
  const [text, setText]     = useState(() => { const v = ls.get("dw_notepad",""); return typeof v === "string" ? v : ""; });
  const [visible, setVis]   = useState(false);
  const taRef = useRef(null);

  // Persistir en cada cambio
  useEffect(() => { ls.set("dw_notepad", text); }, [text]);
  // Focus al abrir
  useEffect(() => { if (visible) setTimeout(() => taRef.current?.focus(), 80); }, [visible]);

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div style={{ position:"relative" }}>
      <button onClick={() => setVis((v) => !v)}
        style={{ padding:"5px 13px", borderRadius:14, fontSize:11, cursor:"pointer",
          border:`1px solid ${visible ? accent : "rgba(255,255,255,0.12)"}`,
          background: visible ? accent.replace("0.85","0.12") : "transparent",
          color: visible ? "white" : "rgba(255,255,255,0.5)",
          display:"flex", alignItems:"center", gap:6, transition:"all 0.2s", fontWeight:visible?500:400 }}>
        <i className="bi bi-pencil-square" style={{ fontSize:13 }} /> Notas
      </button>

      <AnimatePresence>
        {visible && (
          <motion.div initial={{ opacity:0, scale:0.95, y:-6 }} animate={{ opacity:1, scale:1, y:0 }}
            exit={{ opacity:0, scale:0.95, y:-6 }}
            transition={{ type:"spring", stiffness:300, damping:28 }}
            style={{ position:"absolute", top:42, right:0, width:320, zIndex:60,
              borderRadius:22, background:"rgba(8,8,18,0.8)", backdropFilter:"blur(32px)",
              border:"1px solid rgba(255,255,255,0.13)", boxShadow:"0 20px 56px rgba(0,0,0,0.6)",
              overflow:"hidden", pointerEvents:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"10px 16px 8px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
              <span style={{ color:"rgba(255,255,255,0.4)", fontSize:10, letterSpacing:"0.12em", textTransform:"uppercase", fontWeight:600 }}>
                Bloc de notas
              </span>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ color:"rgba(255,255,255,0.18)", fontSize:10 }}>{words}p · {text.length}c</span>
                <button onClick={() => setText("")}
                  style={{ background:"transparent", border:"none", color:"rgba(255,255,255,0.22)",
                    cursor:"pointer", fontSize:14, padding:0 }}>
                  <i className="bi bi-trash3" />
                </button>
              </div>
            </div>
            <textarea ref={taRef} value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Escribe aquí… se guarda automáticamente"
              className="sa"
              style={{ width:"100%", padding:"13px 16px", background:"transparent", border:"none",
                outline:"none", color:"rgba(255,255,255,0.82)", fontSize:13, resize:"none",
                lineHeight:1.75, height:200, boxSizing:"border-box", fontFamily:"inherit", cursor:"text" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE: SETTINGS PANEL
// ─────────────────────────────────────────────────────────────
function SettingsPanel({ prefs, onChange, accent }) {
  const [open, setOpen] = useState(false);
  const fileRef = useRef(null);
  const upd = (k, v) => { const n = { ...prefs, [k]:v }; onChange(n); ls.set("dw_prefs", n); };

  return (
    <div style={{ position:"relative" }}>
      <button onClick={() => setOpen((v) => !v)}
        style={{ width:34, height:34, borderRadius:12, border:"1px solid rgba(255,255,255,0.12)",
          background: open?"rgba(255,255,255,0.08)":"transparent",
          color:"rgba(255,255,255,0.45)", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>
        <i className="bi bi-sliders" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity:0, scale:0.95, y:-6 }} animate={{ opacity:1, scale:1, y:0 }}
            exit={{ opacity:0, scale:0.95, y:-6 }}
            transition={{ type:"spring", stiffness:300, damping:28 }}
            style={{ position:"absolute", top:42, right:0, width:288, zIndex:60,
              borderRadius:22, background:"rgba(8,8,18,0.84)", backdropFilter:"blur(32px)",
              border:"1px solid rgba(255,255,255,0.13)", boxShadow:"0 20px 56px rgba(0,0,0,0.55)",
              padding:"16px 18px", pointerEvents:"auto",
              maxHeight:"80vh", overflowY:"auto" }} className="sa">

            <div style={{ color:"rgba(255,255,255,0.4)", fontSize:10, letterSpacing:"0.15em", textTransform:"uppercase", fontWeight:600, marginBottom:14 }}>
              Personalización
            </div>

            <div style={{ marginBottom:13 }}>
              <div style={{ color:"rgba(255,255,255,0.32)", fontSize:10, marginBottom:5, fontWeight:500 }}>Tu nombre</div>
              <input value={prefs.userName||""} onChange={(e) => upd("userName",e.target.value)} placeholder="¿Cómo te llamas?"
                style={{ width:"100%", padding:"7px 12px", background:"rgba(255,255,255,0.06)",
                  border:"1px solid rgba(255,255,255,0.12)", borderRadius:10, color:"white",
                  fontSize:12, outline:"none", boxSizing:"border-box" }} />
            </div>

            <div style={{ marginBottom:13 }}>
              <div style={{ color:"rgba(255,255,255,0.32)", fontSize:10, marginBottom:8, fontWeight:500 }}>Color de acento</div>
              <div style={{ display:"flex", gap:8 }}>
                {ACCENT_COLORS.map((c) => (
                  <button key={c.name} onClick={() => upd("accentColor",c.value)} title={c.name}
                    style={{ width:22, height:22, borderRadius:"50%", background:c.value, cursor:"pointer", padding:0,
                      border: prefs.accentColor===c.value ? "2.5px solid white" : "2.5px solid transparent" }} />
                ))}
              </div>
            </div>

            {[
              { key:"showClock",    label:"Reloj grande" },
              { key:"showQuote",    label:"Frase del día" },
              { key:"showBreath",   label:"Respiración" },
              { key:"showProgress", label:"Barra de progreso" },
              { key:"showStats",    label:"Estadísticas" },
              { key:"showTasks",    label:"Lista de tareas" },
            ].map(({ key, label }) => (
              <div key={key} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ color:"rgba(255,255,255,0.5)", fontSize:12 }}>{label}</span>
                <button onClick={() => upd(key,!prefs[key])}
                  style={{ width:36, height:20, borderRadius:10, cursor:"pointer",
                    background: prefs[key] ? accent.replace("0.85","0.7") : "rgba(255,255,255,0.12)",
                    border:"none", position:"relative", transition:"background 0.2s" }}>
                  <motion.div animate={{ x:prefs[key]?17:2 }} transition={{ type:"spring", stiffness:300, damping:25 }}
                    style={{ width:15, height:15, borderRadius:"50%", background:"white", position:"absolute", top:2.5 }} />
                </button>
              </div>
            ))}

            <div style={{ marginTop:13 }}>
              <div style={{ color:"rgba(255,255,255,0.32)", fontSize:10, marginBottom:8, fontWeight:500 }}>Fondo de video</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:8 }}>
                {YOUTUBE_VIDEOS.map((v) => (
                  <button key={v.id} onClick={() => { upd("videoId",v.id); upd("customBg",null); }}
                    style={{ padding:"3px 8px", borderRadius:10, fontSize:9, cursor:"pointer",
                      border:`1px solid ${prefs.videoId===v.id&&!prefs.customBg ? accent : "rgba(255,255,255,0.12)"}`,
                      background: prefs.videoId===v.id&&!prefs.customBg ? accent.replace("0.85","0.15") : "transparent",
                      color:"rgba(255,255,255,0.55)" }}>
                    {v.label}
                  </button>
                ))}
              </div>
              <button onClick={() => fileRef.current?.click()}
                style={{ width:"100%", padding:"7px", borderRadius:10, cursor:"pointer",
                  border:"1px dashed rgba(255,255,255,0.2)",
                  background: prefs.customBg ? accent.replace("0.85","0.1") : "transparent",
                  color:"rgba(255,255,255,0.4)", fontSize:11, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                <i className={`bi ${prefs.customBg?"bi-check2-circle":"bi-upload"}`} />
                {prefs.customBg ? "Imagen cargada" : "Subir imagen de fondo"}
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
                onChange={(e) => { const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=(ev)=>upd("customBg",ev.target.result); r.readAsDataURL(f); }} />
              {prefs.customBg && (
                <button onClick={() => upd("customBg",null)}
                  style={{ marginTop:5, background:"transparent", border:"none", color:"rgba(255,255,255,0.22)", fontSize:10, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                  <i className="bi bi-x" /> Quitar imagen
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// APP PRINCIPAL
// ─────────────────────────────────────────────────────────────
const DEFAULT_PREFS = {
  userName:"", accentColor:ACCENT_COLORS[0].value,
  videoId:YOUTUBE_VIDEOS[0].id, customBg:null,
  showClock:true, showQuote:true, showBreath:true,
  showProgress:true, showStats:true, showTasks:true,
};

export default function App() {
  injectAssets();

  const [prefs, setPrefs]       = useState(() => ({ ...DEFAULT_PREFS, ...ls.get("dw_prefs",{}) }));
  const [zenMode, setZen]       = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [toast, setToast]       = useState(null);
  const [panel, setPanel]       = useState(null);
  const [vMuted, setVMuted]     = useState(true);

  const accent = prefs.accentColor || ACCENT_COLORS[0].value;
  const sound  = useSoundMixer();
  const q      = dayQuote();

  const onComplete = useCallback((wasWork) => {
    if (wasWork) {
      setConfetti(true); setTimeout(() => setConfetti(false), 2800);
      setToast({ message:"¡Sesión completada! Descansa un poco.", icon:"bi-check-circle-fill" });
    } else {
      setToast({ message:"¡Descanso terminado! A enfocarse.", icon:"bi-lightning-charge-fill" });
    }
    if (Notification.permission === "granted")
      new Notification("Deep Focus", { body:wasWork?"Tómate un descanso 🧘":"A trabajar 🎯", silent:false });
  }, []);

  const timer = usePomodoro(onComplete);

  useEffect(() => { if (Notification.permission==="default") Notification.requestPermission(); }, []);

  const togglePanel = (name) => setPanel((p) => p===name ? null : name);

  const BTN = (active) => ({
    padding:"5px 13px", borderRadius:14, fontSize:11, cursor:"pointer",
    border:`1px solid ${active ? accent : "rgba(255,255,255,0.12)"}`,
    background: active ? accent.replace("0.85","0.12") : "transparent",
    color: active ? "white" : "rgba(255,255,255,0.5)",
    display:"flex", alignItems:"center", gap:6,
    fontWeight: active ? 500 : 400, transition:"all 0.2s", fontFamily:"inherit",
  });

  return (
    <div style={{ width:"100vw", height:"100vh", overflow:"hidden", position:"relative", userSelect:"none",
      fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display','Inter',system-ui,sans-serif" }}>

      <VideoBg videoId={prefs.videoId} customBg={prefs.customBg} muted={vMuted} />
      <Confetti active={confetti} />
      <AnimatePresence>
        {toast && <Toast key={toast.message} {...toast} onDismiss={() => setToast(null)} />}
      </AnimatePresence>

      {/* ── UI PRINCIPAL ── */}
      <motion.div animate={{ opacity:zenMode?0:1 }} transition={{ duration:1.2, ease:"easeInOut" }}
        style={{ position:"relative", zIndex:20, width:"100%", height:"100%",
          display:"flex", flexDirection:"column", pointerEvents:zenMode?"none":"auto" }}>

        {/* HEADER */}
        <header style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 26px" }}>
          <div>
            <div style={{ color:"white", fontWeight:300, fontSize:17, letterSpacing:"0.14em", textTransform:"uppercase" }}>Deep Work</div>
            <div style={{ color:"rgba(255,255,255,0.28)", fontSize:10, letterSpacing:"0.05em", marginTop:2 }}>
              {timer.total>0 ? `${fmtMin(timer.total)} enfocado hoy` : "Listo para enfocarte"}
            </div>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            {[
              { key:"mixer", icon:"bi-music-note-beamed", label:"Sonidos" },
              { key:"stats", icon:"bi-bar-chart-line",    label:"Stats",  skip:!prefs.showStats },
              { key:"tasks", icon:"bi-check2-square",     label:"Tareas", skip:!prefs.showTasks },
            ].filter((b) => !b.skip).map((b) => (
              <button key={b.key} onClick={() => togglePanel(b.key)} style={BTN(panel===b.key)}>
                <i className={`bi ${b.icon}`} style={{ fontSize:13 }} /> {b.label}
              </button>
            ))}

            {!prefs.customBg && (
              <button onClick={() => setVMuted((m) => !m)} style={BTN(!vMuted)}>
                <i className={`bi ${vMuted?"bi-volume-mute":"bi-volume-up"}`} style={{ fontSize:13 }} /> Video
              </button>
            )}

            <Notepad accent={accent} />

            <button onClick={() => setZen(true)} style={BTN(false)}>
              <i className="bi bi-eye-slash" style={{ fontSize:13 }} /> Zen
            </button>

            <SettingsPanel prefs={prefs} onChange={setPrefs} accent={accent} />
          </div>
        </header>

        {/* CENTRO */}
        <main style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
          justifyContent:"center", gap:20, padding:"0 26px" }}>

          {prefs.showClock && (
            <motion.div initial={{ opacity:0, y:-18 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}>
              <LiveClock userName={prefs.userName} accent={accent} />
            </motion.div>
          )}

          {prefs.showQuote && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.22 }}
              style={{ textAlign:"center", maxWidth:440 }}>
              <p style={{ color:"rgba(255,255,255,0.36)", fontSize:13, fontStyle:"italic", lineHeight:1.6, margin:0, fontWeight:300 }}>
                "{q.text}"
              </p>
              {q.author && <p style={{ color:"rgba(255,255,255,0.18)", fontSize:10, margin:"4px 0 0", letterSpacing:"0.06em" }}>— {q.author}</p>}
            </motion.div>
          )}

          <div style={{ display:"flex", gap:14, alignItems:"flex-start", flexWrap:"wrap", justifyContent:"center" }}>
            <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.18 }}>
              <PomodoroTimer timer={timer} accent={accent} showProgress={prefs.showProgress} />
            </motion.div>

            <AnimatePresence>
              {panel === "mixer" && (
                <motion.div key="mixer" initial={{ opacity:0, x:18 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:18 }}
                  transition={{ type:"spring", stiffness:280, damping:26 }}>
                  <SoundMixer vols={sound.vols} setVol={sound.setVol} paused={sound.paused}
                    togglePause={sound.togglePause} stopAll={sound.stopAll} accent={accent} />
                </motion.div>
              )}
              {panel === "stats" && (
                <motion.div key="stats" initial={{ opacity:0, x:18 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:18 }}
                  transition={{ type:"spring", stiffness:280, damping:26 }}>
                  <FocusStats accent={accent} />
                </motion.div>
              )}
              {panel === "tasks" && (
                <motion.div key="tasks" initial={{ opacity:0, x:18 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:18 }}
                  transition={{ type:"spring", stiffness:280, damping:26 }}>
                  <TaskList accent={accent} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* FOOTER */}
        <footer style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", padding:"14px 26px" }}>
          {prefs.showBreath ? <BreathingGuide accent={accent} /> : <div />}
          <div style={{ color:"rgba(255,255,255,0.12)", fontSize:10, textAlign:"right", lineHeight:1.6, fontWeight:300 }}>
            Modo Zen — oculta la UI<br />Pulsa <i className="bi bi-eye" style={{ fontSize:10 }} /> para salir
          </div>
        </footer>
      </motion.div>

      {/* ── ZEN MODE — botón flotante para salir ── */}
      <AnimatePresence>
        {zenMode && (
          <motion.div key="zen" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            transition={{ duration:1.1 }}
            style={{ position:"absolute", inset:0, zIndex:30, pointerEvents:"none" }}>
            <motion.button
              initial={{ opacity:0, scale:0.8, y:10 }} animate={{ opacity:1, scale:1, y:0 }}
              exit={{ opacity:0, scale:0.8 }}
              transition={{ delay:0.55, type:"spring", stiffness:280, damping:24 }}
              onClick={() => setZen(false)}
              style={{ pointerEvents:"auto", position:"absolute", bottom:28, right:28,
                width:46, height:46, borderRadius:"50%",
                background:"rgba(255,255,255,0.1)", backdropFilter:"blur(16px)",
                border:"1px solid rgba(255,255,255,0.22)", color:"white", cursor:"pointer",
                fontSize:19, display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:"0 4px 20px rgba(0,0,0,0.3)" }}>
              <i className="bi bi-eye" />
            </motion.button>
            <motion.span
              animate={{ opacity:[0.07,0.18,0.07] }} transition={{ duration:5, repeat:Infinity }}
              style={{ position:"absolute", bottom:40, right:84, color:"white",
                fontSize:9, letterSpacing:"0.18em", textTransform:"uppercase", fontWeight:500 }}>
              Salir del Zen
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
