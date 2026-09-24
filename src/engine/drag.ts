/**
 * Forgiving one-finger drag: the object follows the finger, and on release the caller decides
 * (usually "is it within the snap radius of a slot?"). Rejected drops glide home.
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

export function makeDraggable(game: GameApp, obj: Container, opts: DragOpts) {
  obj.eventMode = 'static';
  obj.cursor = 'grab';
  let dragging = false;
  let moved = false;
  let startGlobal = new Point();
  const offset = new Point();
  let home = new Point();
  const stage = game.app.stage;

  const move = (e: FederatedPointerEvent) => {
    if (!dragging || e.pointerId !== activePointer) return;
    if (!moved && Math.hypot(e.global.x - startGlobal.x, e.global.y - startGlobal.y) > 8) moved = true;
    const p = obj.parent!.toLocal(e.global);
    obj.position.set(p.x - offset.x, p.y - offset.y);
  };
  const end = (e: FederatedPointerEvent) => {
    if (!dragging || e.pointerId !== activePointer) return;
    dragging = false;
    activePointer = null;
    stage.off('globalpointermove', move);
    stage.off('pointerup', end);
    stage.off('pointerupoutside', end);
    void tween(obj.scale, { x: 1, y: 1 }, { duration: 150 });
    if (!moved) {
      obj.position.copyFrom(home);
      opts.onTapOnly?.();
      return;
    }
    const accepted = opts.onDrop(e.global.clone());
    if (!accepted) {
      void tween(obj, { x: home.x, y: home.y }, { duration: 320, ease: ease.outBack });
    }
  };
  obj.on('pointerdown', (e: FederatedPointerEvent) => {
    if (activePointer !== null || obj.destroyed) return;
    activePointer = e.pointerId;
    dragging = true;
    moved = false;
    startGlobal = e.global.clone();
    home = obj.position.clone();
    const p = obj.parent!.toLocal(e.global);
    offset.set(p.x - obj.x, p.y - obj.y);
    obj.parent!.addChild(obj); // bring to front
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

/** Distance test in the parent's units for a drop against a target point (snap radius in CSS px → units). */
export function within(game: GameApp, global: Point, target: Container, cssRadius = 96): boolean {
  const tp = target.getGlobalPosition();
  const d = Math.hypot(global.x - tp.x, global.y - tp.y);
  // global coordinates are CSS pixels → compare with the CSS-px snap radius (+ the target's own size)
  return d <= cssRadius + (target.width * game.scale) / 4;
}
