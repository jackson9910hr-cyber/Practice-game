#!/usr/bin/env python3
"""
Generates the English voice recordings (public/audio/en/**.mp3) for every en-US line in
src/data/audio-manifest.json with the open Piper neural TTS, and links them in the manifest.

Voice: Piper "en-us-libritts-high" (LibriTTS, CC BY 4.0), speaker 172 — chosen from 904 speakers
by signal-to-noise, pitch (female, ~225 Hz) and an ASR intelligibility test (2% WER).
Phonemes are synthesised from IPA so the phonics games hear real sounds, not letter names.

Setup (dev only, not part of the app):
  pip install piper-tts lameenc numpy
  curl -L -o voice.tgz https://github.com/rhasspy/piper/releases/download/v0.0.2/voice-en-us-libritts-high.tar.gz
  tar xzf voice.tgz -C /tmp/libritts
Usage:
  python3 scripts/gen-voice.py [--model /tmp/libritts/en-us-libritts-high.onnx] [--force]
Lines that already have a file (e.g. a native recording you added) are kept unless --force.
Korean lines stay on the device's Korean voice (no open Korean Piper voice exists yet).
"""
import argparse
import json
import os
import sys

import lameenc
import numpy as np
from piper import PiperVoice
from piper.config import SynthesisConfig

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
MANIFEST = os.path.join(ROOT, 'src', 'data', 'audio-manifest.json')
PUBLIC = os.path.join(ROOT, 'public')
SPEAKER = 172
GENERATED_MARK = 'generated:piper-libritts-172'

# Phonics sounds (IPA). Voiceless stops are clipped (no "uh"); voiced stops need a tiny schwa.
PHONEMES = {
    's': 'sːːː', 'a': 'æː', 't': 't', 'p': 'p', 'i': 'ɪː', 'n': 'nːː', 'm': 'mːː', 'd': 'də',
    'g': 'ɡə', 'o': 'ɑː', 'c': 'k', 'k': 'k', 'e': 'ɛː', 'u': 'ʌː', 'r': 'ɹːː', 'h': 'hə',
    'b': 'bə', 'f': 'fːːː', 'l': 'lːː', 'j': 'dʒə', 'v': 'vːː', 'w': 'wə', 'x': 'ks', 'y': 'jə',
    'z': 'zːː', 'q': 'kwə',
}


def trim_normalize(x: np.ndarray, sr: int) -> np.ndarray:
    """Trim silence (keep 40 ms), fade edges, normalise peak to -1 dBFS."""
    frame = int(0.01 * sr)
    rms = np.array([np.sqrt(np.mean(x[i:i + frame] ** 2)) for i in range(0, max(1, len(x) - frame), frame)])
    thr = max(0.008, rms.max() * 0.03) if len(rms) else 0
    idx = np.where(rms > thr)[0]
    if len(idx):
        pad = int(0.04 * sr)
        x = x[max(0, idx[0] * frame - pad):min(len(x), (idx[-1] + 1) * frame + pad)]
    fade = min(len(x) // 4, int(0.008 * sr))
    if fade > 0:
        ramp = np.linspace(0, 1, fade)
        x[:fade] *= ramp
        x[-fade:] *= ramp[::-1]
    peak = np.abs(x).max()
    return x * (0.89 / peak) if peak > 0 else x


def encode_mp3(x: np.ndarray, sr: int) -> bytes:
    enc = lameenc.Encoder()
    enc.set_bit_rate(48)
    enc.set_in_sample_rate(sr)
    enc.set_channels(1)
    enc.set_quality(2)
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()
    return enc.encode(pcm) + enc.flush()


def path_for(line_id: str) -> str:
    # en.word.red → audio/en/word/red.mp3 ; en.t.i-like-red → audio/en/t/i-like-red.mp3
    parts = line_id.split('.')
    return '/'.join(['audio', parts[0], parts[1], '.'.join(parts[2:]) + '.mp3'])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', default='/tmp/libritts/en-us-libritts-high.onnx')
    ap.add_argument('--force', action='store_true')
    args = ap.parse_args()
    voice = PiperVoice.load(args.model)
    sr = voice.config.sample_rate
    data = json.load(open(MANIFEST, encoding='utf-8'))
    entries = data['entries']
    made = kept = 0
    for line_id, e in sorted(entries.items()):
        if e['lang'] != 'en-US':
            continue
        if e.get('file') and not args.force and e.get('source') != GENERATED_MARK:
            kept += 1  # a native recording someone added: never overwrite
            continue
        kind = line_id.split('.')[1]
        if kind == 'phoneme':
            text = f"[[ {PHONEMES[line_id.split('.')[2]]} ]]"
        else:
            text = e['text']
        # slower for single words and letters (spec: English at ~0.8 speed), natural for sentences
        slow = kind in ('word', 'pic', 'letter', 'card', 'num', 'dir', 'phoneme')
        cfg = SynthesisConfig(speaker_id=SPEAKER, length_scale=1.25 if slow else 1.12, noise_scale=0.5, noise_w_scale=0.6)
        pcm = b''.join(c.audio_int16_bytes for c in voice.synthesize(text, syn_config=cfg))
        x = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768
        x = trim_normalize(x, sr)
        rel = path_for(line_id)
        out = os.path.join(PUBLIC, rel)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out, 'wb') as f:
            f.write(encode_mp3(x, sr))
        e['file'] = rel
        e['source'] = GENERATED_MARK
        made += 1
        if made % 100 == 0:
            print(f'  {made} lines…', flush=True)
    data['attribution'] = (
        'English voice: Piper neural TTS (MIT) with the "en-us-libritts-high" model, trained on LibriTTS '
        '(Zen et al., CC BY 4.0, openslr.org/60), speaker 172.'
    )
    with open(MANIFEST, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(f'generated {made} English lines, kept {kept} existing recordings')


if __name__ == '__main__':
    sys.exit(main())
