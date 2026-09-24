/**
 * "따라 말하기" recorder: records a few seconds on-device only. The stream is released right
 * after recording so the mic indicator never stays on. No scoring, no upload — ever.
 */
export function canRecord(): boolean {
  return (
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined' &&
    window.isSecureContext
  );
}

function mimeType(): string | undefined {
  for (const t of ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']) {
    if (MediaRecorder.isTypeSupported?.(t)) return t;
  }
  return undefined;
}

export interface Recording {
  blob: Blob;
  ms: number;
}

export class Recorder {
  private rec: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private resolveStop: ((r: Recording | null) => void) | null = null;

  async start(maxMs = 5000): Promise<Recording | null> {
    if (!canRecord()) return null;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      return null;
    }
    const type = mimeType();
    const rec = new MediaRecorder(this.stream, type ? { mimeType: type } : undefined);
    this.rec = rec;
    const chunks: Blob[] = [];
    const started = performance.now();
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const result = new Promise<Recording | null>((resolve) => {
      this.resolveStop = resolve;
      rec.onstop = () => {
        this.release();
        resolve(
          chunks.length
            ? {
                blob: new Blob(chunks, { type: rec.mimeType || type || 'audio/mp4' }),
                ms: performance.now() - started,
              }
            : null,
        );
      };
    });
    rec.start();
    setTimeout(() => this.stop(), maxMs);
    return result;
  }

  stop() {
    if (this.rec && this.rec.state !== 'inactive') this.rec.stop();
    else if (this.resolveStop) {
      this.release();
      this.resolveStop(null);
    }
  }

  private release() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.rec = null;
  }
}

export async function playBlob(blob: Blob): Promise<void> {
  const url = URL.createObjectURL(blob);
  const el = new Audio(url);
  await new Promise<void>((resolve) => {
    el.onended = () => resolve();
    el.onerror = () => resolve();
    el.play().catch(() => resolve());
  });
  URL.revokeObjectURL(url);
}
