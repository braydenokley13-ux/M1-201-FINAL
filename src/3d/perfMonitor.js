export function createPerfMonitor(options = {}) {
  const settings = {
    sampleWindowMs: options.sampleWindowMs ?? 1000,
    warmupMs: options.warmupMs ?? 4500,
    sustainMs: options.sustainMs ?? 6000,
    cooldownMs: options.cooldownMs ?? 12000
  };

  let elapsedMs = 0;
  let runtimeMs = 0;
  let frames = 0;
  let fps = 60;
  let minFps = Infinity;
  let lowFpsSustainMs = 0;
  let cooldownRemainingMs = 0;
  let downgradeCount = 0;
  let pendingDowngrade = null;

  return {
    tick(deltaSeconds, qualityMode, thresholdFps, canDowngrade) {
      const deltaMs = deltaSeconds * 1000;
      runtimeMs += deltaMs;
      elapsedMs += deltaMs;
      frames += 1;
      cooldownRemainingMs = Math.max(0, cooldownRemainingMs - deltaMs);

      if (elapsedMs < settings.sampleWindowMs) {
        return;
      }

      const sampleElapsedMs = elapsedMs;
      const sampleFrames = frames;
      elapsedMs = 0;
      frames = 0;

      fps = Math.max(1, Math.round((sampleFrames * 1000) / sampleElapsedMs));
      minFps = Math.min(minFps, fps);

      const warmupComplete = runtimeMs >= settings.warmupMs;
      if (!warmupComplete || !canDowngrade || thresholdFps <= 0) {
        lowFpsSustainMs = 0;
        return;
      }

      // During cooldown, do not accumulate sustain time.
      // A new downgrade must earn a fresh low-FPS streak after cooldown ends.
      if (cooldownRemainingMs > 0) {
        lowFpsSustainMs = 0;
        return;
      }

      if (fps < thresholdFps) {
        lowFpsSustainMs += sampleElapsedMs;
      } else {
        lowFpsSustainMs = 0;
      }

      if (cooldownRemainingMs <= 0 && lowFpsSustainMs >= settings.sustainMs) {
        pendingDowngrade = {
          from: qualityMode,
          fps,
          thresholdFps,
          runtimeMs: Math.round(runtimeMs),
          sustainMs: Math.round(lowFpsSustainMs)
        };
        downgradeCount += 1;
        cooldownRemainingMs = settings.cooldownMs;
        lowFpsSustainMs = 0;
      }
    },
    consumeDowngradeSignal() {
      const signal = pendingDowngrade;
      pendingDowngrade = null;
      return signal;
    },
    snapshot() {
      return {
        fps,
        minFps: Number.isFinite(minFps) ? minFps : fps,
        runtimeMs: Math.round(runtimeMs),
        lowFpsSustainMs: Math.round(lowFpsSustainMs),
        cooldownRemainingMs: Math.round(cooldownRemainingMs),
        downgradeCount
      };
    }
  };
}
