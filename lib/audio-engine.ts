type TrackKey = "sound1" | "sound2" | "sound3";

type PlayTrackOptions = {
  repeats?: number;
  targetGain?: number;
  fadeInDurationMs?: number;
  loop?: boolean;
};

const TRACKS: Record<TrackKey, string> = {
  sound1: "/audio/sound1.mp3",
  sound2: "/audio/sound2.mp3",
  sound3: "/audio/sound3.mp3",
};

export class CinematicAudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private trackGains: Partial<Record<TrackKey, GainNode>> = {};
  private elements: Partial<Record<TrackKey, HTMLAudioElement>> = {};
  private sources: Partial<Record<TrackKey, MediaElementAudioSourceNode>> = {};
  private trackCleanup: Partial<Record<TrackKey, () => void>> = {};
  private crossfadeFrame = 0;
  private initialized = false;

  async initFromGesture(): Promise<void> {
    if (this.initialized) return;

    const AudioContextCtor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextCtor) {
      throw new Error("Web Audio API is not supported in this browser.");
    }

    this.context = new AudioContextCtor();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.92;
    this.masterGain.connect(this.context.destination);

    await Promise.all(
      (Object.keys(TRACKS) as TrackKey[]).map(async (key) => {
        const audio = new Audio(TRACKS[key]);
        audio.loop = false;
        audio.preload = "auto";
        audio.crossOrigin = "anonymous";

        const gain = this.context!.createGain();
        gain.gain.value = 0;
        gain.connect(this.masterGain!);

        const source = this.context!.createMediaElementSource(audio);
        source.connect(gain);

        this.elements[key] = audio;
        this.trackGains[key] = gain;
        this.sources[key] = source;
      }),
    );

    this.initialized = true;
  }

  async playSound1(): Promise<void> {
    await this.playTrack("sound1", {
      repeats: 2,
      targetGain: 0.85,
      fadeInDurationMs: 2400,
    });
  }

  async playYearsSound(): Promise<void> {
    await this.playTrack("sound3", {
      repeats: 1,
      targetGain: 0.78,
      fadeInDurationMs: 1600,
    });
  }

  async playSound2Loop(): Promise<void> {
    await this.playTrack("sound2", {
      repeats: 1,
      targetGain: 0.82,
      fadeInDurationMs: 1400,
      loop: true,
    });
  }

  stopSound1(): void {
    this.stopTrack("sound1");
  }

  stopYearsSound(): void {
    this.stopTrack("sound3");
  }

  crossfadeToSound2(durationMs = 5200): void {
    if (!this.context) return;

    const sound1 = this.elements.sound1;
    const sound2 = this.elements.sound2;
    const gain1 = this.trackGains.sound1;
    const gain2 = this.trackGains.sound2;
    if (!sound1 || !sound2 || !gain1 || !gain2) return;

    this.stopTrack("sound3");

    if (this.crossfadeFrame) {
      cancelAnimationFrame(this.crossfadeFrame);
    }

    sound2.currentTime = 0;
    void sound2.play().catch(() => undefined);

    const start = performance.now();
    const from1 = gain1.gain.value;
    const from2 = gain2.gain.value;
    const target1 = 0.0001;
    const target2 = 0.88;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = t * t * (3 - 2 * t);

      gain1.gain.setTargetAtTime(
        from1 + (target1 - from1) * eased,
        this.context!.currentTime,
        0.08,
      );
      gain2.gain.setTargetAtTime(
        from2 + (target2 - from2) * eased,
        this.context!.currentTime,
        0.08,
      );

      if (t < 1) {
        this.crossfadeFrame = requestAnimationFrame(step);
      } else {
        this.crossfadeFrame = 0;
        void sound1.pause();
        gain1.gain.value = 0.0001;
      }
    };

    this.crossfadeFrame = requestAnimationFrame(step);
  }

  dispose(): void {
    if (this.crossfadeFrame) cancelAnimationFrame(this.crossfadeFrame);

    (Object.keys(this.elements) as TrackKey[]).forEach((key) => {
      this.stopTrack(key);
      const audio = this.elements[key];
      if (audio) audio.src = "";
    });

    void this.context?.close();
    this.context = null;
    this.masterGain = null;
    this.trackGains = {};
    this.elements = {};
    this.sources = {};
    this.initialized = false;
  }

  private async ensureRunning(): Promise<void> {
    if (!this.context) return;
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  private async playTrack(
    key: TrackKey,
    {
      repeats = 1,
      targetGain = 0.8,
      fadeInDurationMs = 1800,
      loop = false,
    }: PlayTrackOptions = {},
  ): Promise<void> {
    await this.ensureRunning();

    const audio = this.elements[key];
    const gain = this.trackGains[key];
    if (!audio || !gain || !this.context) return;

    this.stopTrack(key);

    const totalPlays = Math.max(1, Math.floor(repeats));
    let remainingPlays = totalPlays;

    const handleEnded = () => {
      remainingPlays -= 1;
      if (remainingPlays > 0) {
        audio.currentTime = 0;
        void audio.play().catch(() => undefined);
        return;
      }

      this.clearTrackCleanup(key);
      gain.gain.setTargetAtTime(0.0001, this.context!.currentTime, 0.08);
    };

    audio.loop = loop;
    audio.addEventListener("ended", handleEnded);
    this.trackCleanup[key] = () => {
      audio.removeEventListener("ended", handleEnded);
    };

    audio.currentTime = 0;
    gain.gain.cancelScheduledValues(this.context.currentTime);
    gain.gain.setValueAtTime(0.0001, this.context.currentTime);
    await audio.play().catch(() => undefined);

    if (fadeInDurationMs <= 0) {
      gain.gain.value = targetGain;
      return;
    }

    gain.gain.exponentialRampToValueAtTime(
      targetGain,
      this.context.currentTime + fadeInDurationMs / 1000,
    );
  }

  private stopTrack(key: TrackKey): void {
    const audio = this.elements[key];
    const gain = this.trackGains[key];

    this.clearTrackCleanup(key);

    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    if (gain && this.context) {
      gain.gain.cancelScheduledValues(this.context.currentTime);
      gain.gain.setValueAtTime(0.0001, this.context.currentTime);
    }
  }

  private clearTrackCleanup(key: TrackKey): void {
    const cleanup = this.trackCleanup[key];
    if (!cleanup) return;
    cleanup();
    delete this.trackCleanup[key];
  }
}

export const audioEngine = new CinematicAudioEngine();
