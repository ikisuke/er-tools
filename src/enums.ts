import type { Attribute } from "./parse";

const CELL_CLASSES = ["attribute-type", "attribute-name", "attribute-keys", "attribute-comment"];

/** Popover that lists the enum values of one column, positioned inside `stage`. */
export class EnumPopover {
  private readonly el: HTMLElement;
  private readonly stage: HTMLElement;
  private activeRow: Element[] = [];
  private returnFocus: HTMLElement | SVGElement | null = null;

  constructor(el: HTMLElement, stage: HTMLElement) {
    this.el = el;
    this.stage = stage;
    el.querySelector(".enum-popover-close")!.addEventListener("click", () => this.close(true));
    stage.addEventListener("pointerdown", (e) => {
      if (!this.el.hidden && !this.el.contains(e.target as Node)) this.close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !this.el.hidden) this.close(true);
    });
  }

  open(entity: string, attribute: Attribute, row: Element[], anchor: HTMLElement | SVGElement) {
    const values = attribute.enumValues ?? [];
    this.setActive(row);
    this.returnFocus = anchor;
    this.el.querySelector(".enum-popover-title")!.textContent = `${entity}.${attribute.name}`;
    this.el.querySelector(".enum-popover-meta")!.textContent = `型: ${attribute.type} ・ ${values.length} 件`;
    this.el.querySelector(".enum-values")!.replaceChildren(
      ...values.map((value) => {
        const li = document.createElement("li");
        li.textContent = value;
        return li;
      }),
    );
    this.el.querySelector(".enum-popover-source")!.textContent = `図のコメント: "${attribute.comment ?? ""}"`;
    this.el.hidden = false;
    this.place(row);
    this.el.querySelector<HTMLButtonElement>(".enum-popover-close")!.focus({ preventScroll: true });
  }

  close(restoreFocus = false) {
    if (this.el.hidden) return;
    this.el.hidden = true;
    this.setActive([]);
    if (restoreFocus) this.returnFocus?.focus({ preventScroll: true });
    this.returnFocus = null;
  }

  private setActive(row: Element[]) {
    for (const part of this.activeRow) part.classList.remove("er-enum-active");
    this.activeRow = row;
    for (const part of row) part.classList.add("er-enum-active");
  }

  private place(row: Element[]) {
    const stageBox = this.stage.getBoundingClientRect();
    const boxes = row.map((part) => part.getBoundingClientRect());
    const right = Math.max(...boxes.map((b) => b.right)) - stageBox.left;
    const left = Math.min(...boxes.map((b) => b.left)) - stageBox.left;
    const top = Math.min(...boxes.map((b) => b.top)) - stageBox.top;
    const width = this.el.offsetWidth;
    const height = this.el.offsetHeight;
    const margin = 8;
    let x = right + margin;
    if (x + width > stageBox.width - margin) x = Math.max(margin, left - width - margin);
    const y = Math.min(Math.max(margin, top - 12), Math.max(margin, stageBox.height - height - margin));
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
  }
}

/**
 * Makes every enum column of a rendered entity node open the popover.
 * Mermaid draws one row rectangle and one label per cell for each attribute,
 * in the order the attributes are written, so rows are matched by position
 * and confirmed by the column name.
 */
export function decorateEnumColumns(node: Element, entity: string, attributes: Attribute[], popover: EnumPopover) {
  if (!attributes.some((a) => a.enumValues)) return;
  const rows = [...node.querySelectorAll(":scope > g.row-rect-odd, :scope > g.row-rect-even")];
  const cells = CELL_CLASSES.map((cls) => [...node.querySelectorAll(`:scope > g.label.${cls}`)]);

  attributes.forEach((attribute, i) => {
    if (!attribute.enumValues) return;
    const nameCell = cells[1][i];
    if (!nameCell || nameCell.textContent?.trim() !== attribute.name) return;
    const row = [rows[i], ...cells.map((list) => list[i])].filter((part): part is Element => Boolean(part));
    const description = `${entity}.${attribute.name} の値: ${attribute.enumValues.join("、")}`;

    for (const part of row) {
      part.classList.add("er-enum");
      part.addEventListener("click", (e) => {
        e.stopPropagation();
        popover.open(entity, attribute, row, nameCell as SVGElement);
      });
    }
    nameCell.classList.add("er-enum-name");
    nameCell.setAttribute("role", "button");
    nameCell.setAttribute("tabindex", "0");
    nameCell.setAttribute("aria-label", `${description}（押すと一覧を表示）`);
    nameCell.addEventListener("keydown", (e) => {
      const key = (e as KeyboardEvent).key;
      if (key === "Enter" || key === " ") {
        e.preventDefault();
        popover.open(entity, attribute, row, nameCell as SVGElement);
      }
    });
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = description;
    rows[i]?.prepend(title);
  });
}
