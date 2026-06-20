/**
 * radio.ts — Singleton Audio pour le player radio persistant entre les navigations.
 * Pas de dépendance externe : simple module-level state + subscriber pattern.
 */

export type RadioStation = {
  id: string;
  name: string;
  stream_url: string;
  logo_url?: string | null;
};

type Listener = () => void;

const listeners = new Set<Listener>();
let _audio: HTMLAudioElement | null = null;
let _station: RadioStation | null = null;
let _playing = false;
let _loading = false;
let _error: string | null = null;

function getAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!_audio) {
    _audio = new Audio();
    _audio.preload = "none";
    _audio.addEventListener("play",    () => { _playing = true;  _loading = false; notify(); });
    _audio.addEventListener("pause",   () => { _playing = false; notify(); });
    _audio.addEventListener("ended",   () => { _playing = false; notify(); });
    _audio.addEventListener("waiting", () => { _loading = true;  notify(); });
    _audio.addEventListener("canplay", () => { _loading = false; notify(); });
    _audio.addEventListener("error",   () => {
      _loading = false;
      _playing = false;
      _error = "Flux indisponible";
      notify();
    });
  }
  return _audio;
}

function notify() {
  listeners.forEach((l) => l());
}

// ── API publique ──────────────────────────────────────────────────────────────

export function playStation(station: RadioStation): void {
  const a = getAudio();
  if (!a) return;
  _error = null;
  if (_station?.stream_url !== station.stream_url) {
    a.src = station.stream_url;
    a.load();
  }
  _station = station;
  _loading = true;
  notify();
  a.play().catch((err) => {
    console.error("[radio] play error:", err);
    _loading = false;
    _error = "Lecture impossible";
    notify();
  });
}

export function pause(): void {
  getAudio()?.pause();
}

export function toggle(): void {
  if (_playing) {
    pause();
  } else if (_station) {
    playStation(_station);
  }
}

export function stop(): void {
  const a = getAudio();
  if (!a) return;
  a.pause();
  a.src = "";
  _station = null;
  _playing = false;
  _loading = false;
  _error = null;
  notify();
}

export function subscribe(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getState() {
  return {
    station: _station,
    playing: _playing,
    loading: _loading,
    error: _error,
  };
}
