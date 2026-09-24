/**
 * Forgiving one-finger drag: the object follows the finger, and on release the caller decides
 * (usually "is it within the snap radius of a slot?"). Rejected drops glide home.
 * iOS can cancel a touch (system gesture, notification, call): that must never leave dragging
 * locked, so every exit path funnels through `reset`.
 */
import { Point, type Container, type FederatedPointerEvent } from 'pixi.js';
import { sfx } from '../audio/sfx';
import type { GameApp } from './app';
import { ease, tween } from './tween';

export interface DragOpts {
  /** return true if the drop was accepted (caller moves the object), false to send it home */
  onDrop: (global: Point) => boolean;
  onStart?: () => void;
  onTapOnly?: () => void;
}

let activePointer: number | null = null;
/** cancels whatever drag is in progress (pointercancel, blur, scene change) */
let cancelActive: (() => void) | null = null;
let globalHooked = false;

/** Cancel any drag in progress (called by the router on scene change, and on pointercancel/blur). */
export function cancelDrag() {
  cancelActive?.();
  cancelActive = null;
  activePointer = null;
}

function hookGlobal(game: GameApp) {
  if (globalHooked) return;
  globalHooked = true;
  // Pixi's EventSystem does not map native pointercancel in pointer-event mode
  game.app.canvas.addEventListener('pointercancel', cancelDrag);
  window.addEventListener('blur', cancelDrag);
}

export function makeDraggable(game: GameApp, obj: Container, opts: DragOpts) {
  hookGlobal(game);
  obj.eventMode = 'static';
  obj.cursor = 'grab';
  let dragging = false;
  let moved = false;
  let startGlobal = new Point();
  const offset = new Point();
  let home = new Point();
  const stage = game.app.stage;

  const detach = () => {
    dragging = false;
    stage.off('globalpointermove', move);
    stage.off('pointerup', end);
    stage.off('pointerupoutside', end);
    if (cancelActive === cancel) cancelActive = null;
    activePointer = null;
  };
  const cancel = () => {
    if (!dragging) return;
    detach();
    if (obj.destroyed) return;
    obj.scale.set(1);
    void tween(obj, { x: home.x, y: home.y }, { duration: 250, ease: ease.outQuad });
  };
  const move = (e: FederatedPointerEvent) => {
    if (!dragging || e.pointerId !== activePointer) return;
    if (obj.destroyed || !obj.parent) return cancel();
    if (!moved && Math.hypot(e.global.x - startGlobal.x, e.global.y - startGlobal.y) > 8) moved = true;
    const p = obj.parent.toLocal(e.global);
    obj.position.set(p.x - offset.x, p.y - offset.y);
  };
  const end = (e: FederatedPointerEvent) => {
    if (!dragging || e.pointerId !== activePointer) return;
    detach();
    if (obj.destroyed || !obj.parent) return;
    void tween(obj.scale, { x: 1, y: 1 }, { duration: 150 });
    if (!moved) {
      obj.position.copyFrom(home);
      opts.onTapOnly?.();
      return;
    }
    const accepted = opts.onDrop(e.global.clone());
    if (!accepted && !obj.destroyed) {
      void tween(obj, { x: home.x, y: home.y }, { duration: 320, ease: ease.outBack });
    }
  };
  obj.once('destroyed', cancel);
  obj.on('pointerdown', (e: FederatedPointerEvent) => {
    if (obj.destroyed || !obj.parent) return;
    // a stale drag (lost pointerup) must not block a fresh touch
    if (activePointer !== null) cancelDrag();
    activePointer = e.pointerId;
    cancelActive = cancel;
    dragging = true;
    moved = false;
    startGlobal = e.global.clone();
    home = obj.position.clone();
    const p = obj.parent.toLocal(e.global);
    offset.set(p.x - obj.x, p.y - obj.y);
    obj.parent.addChild(obj); // bring to front
    void tween(obj.scale, { x: 1.1, y: 1.1 }, { duration: 120 });
    sfx.pickup();
    opts.onStart?.();
    stage.on('globalpointermove', move);
    stage.on('pointerup', end);
    stage.on('pointerupoutside', end);
  });
  return {
    setHome(x: number, y: number) {
      home.set(x, y);
    },
  };
}

/** Distance test for a drop against a target (snap radius in CSS px, plus the target's own size). */
export function within(game: GameApp, global: Point, target: Container, cssRadius = 96): boolean {
  const tp = target.getGlobalPosition();
  const d = Math.hypot(global.x - tp.x, global.y - tp.y);
  return d <= cssRadius + (target.width * game.scale) / 4;
}
