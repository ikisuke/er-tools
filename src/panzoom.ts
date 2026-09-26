import { centerOn, fitView, STEP, wheelFactor, zoomAt, type Size, type View } from "./zoom";

const DRAG_THRESHOLD = 4;

/**
 * Wheel zoom and drag-to-pan for the element `content` inside `stage`.
 * A press only becomes a drag after moving past a small threshold, so clicks
 * on linked entities inside the diagram still reach their handlers.
 */
export class PanZoom {
  private view: View = { scale: 1, x: 0, y: 0 };
  private drag: { id: number; startX: number; startY: number; origin: View; active: boolean } | null = null;
  private suppressClick = false;
  private readonly stage: HTMLElement;
  private readonly content: HTMLElement;
  private readonly onChange: (view: View) => void;

  constructor(stage: HTMLElement, content: HTMLElement, onChange: (view: View) => void) {
    this.stage = stage;
    this.content = content;
    this.onChange = onChange;
    stage.addEventListener("wheel", (e) => this.onWheel(e), { passive: false });
    stage.addEventListener("pointerdown", (e) => this.onPointerDown(e));
    stage.addEventListener("pointermove", (e) => this.onPointerMove(e));
    stage.addEventListener("pointerup", (e) => this.onPointerUp(e));
    stage.addEventListener("pointercancel", (e) => this.onPointerUp(e));
    stage.addEventListener(
      "click",
      (e) => {
        if (this.suppressClick) {
          e.stopPropagation();
          e.preventDefault();
          this.suppressClick = false;
        }
      },
      true,
    );
  }

  get scale(): number {
    return this.view.scale;
  }

  zoomIn() {
    this.zoomAtCenter(STEP);
  }

  zoomOut() {
    this.zoomAtCenter(1 / STEP);
  }

  fit(animate = true) {
    this.apply(fitView(this.contentSize(), this.stageSize()), animate);
  }

  /** Centers `element` (inside the content) at `scale`, or at least 100% by default. */
  reveal(element: Element, scale = Math.max(1, this.view.scale)) {
    const box = element.getBoundingClientRect();
    const origin = this.content.getBoundingClientRect();
    const cx = (box.left + box.width / 2 - origin.left) / this.view.scale;
    const cy = (box.top + box.height / 2 - origin.top) / this.view.scale;
    this.apply(centerOn(cx, cy, scale, this.stageSize()), true);
  }

  private zoomAtCenter(factor: number) {
    const s = this.stageSize();
    this.apply(zoomAt(this.view, factor, s.width / 2, s.height / 2), true);
  }

  private stageSize(): Size {
    return { width: this.stage.clientWidth, height: this.stage.clientHeight };
  }

  private contentSize(): Size {
    return { width: this.content.offsetWidth, height: this.content.offsetHeight };
  }

  private apply(view: View, animate: boolean) {
    this.view = view;
    this.content.classList.toggle("animating", animate);
    this.content.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
    this.onChange(view);
  }

  private onWheel(e: WheelEvent) {
    if (!this.content.firstElementChild) return;
    e.preventDefault();
    const rect = this.stage.getBoundingClientRect();
    const delta = e.deltaMode === WheelEvent.DOM_DELTA_LINE ? e.deltaY * 16 : e.deltaY;
    this.apply(zoomAt(this.view, wheelFactor(delta), e.clientX - rect.left, e.clientY - rect.top), false);
  }

  private onPointerDown(e: PointerEvent) {
    if (e.button !== 0 || this.drag || (e.target as Element).closest(".zoom-controls")) return;
    this.drag = { id: e.pointerId, startX: e.clientX, startY: e.clientY, origin: this.view, active: false };
  }

  private onPointerMove(e: PointerEvent) {
    const drag = this.drag;
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.active) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      drag.active = true;
      this.stage.setPointerCapture(e.pointerId);
      this.stage.classList.add("panning");
    }
    this.apply({ ...drag.origin, x: drag.origin.x + dx, y: drag.origin.y + dy }, false);
  }

  private onPointerUp(e: PointerEvent) {
    const drag = this.drag;
    if (!drag || drag.id !== e.pointerId) return;
    if (drag.active) {
      this.suppressClick = true;
      this.stage.releasePointerCapture(e.pointerId);
      this.stage.classList.remove("panning");
      setTimeout(() => (this.suppressClick = false), 0);
    }
    this.drag = null;
  }
}
