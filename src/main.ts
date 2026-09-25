import mermaid from "mermaid";
import "./style.css";
import { buildDefinitionIndex, loadGroups, resolveLinks, type DefinitionIndex, type LinkTarget, type LoadedGroup } from "./links";
import { entityIdFromNodeId } from "./svg";
import { mermaidConfig, type ColorScheme } from "./theme";

interface DiagramBundle {
  groups: { name: string; file: string; source: string }[];
  warnings: string[];
}

const groupSelect = document.querySelector<HTMLSelectElement>("#group-select")!;
const viewport = document.querySelector<HTMLElement>("#viewport")!;
const statusEl = document.querySelector<HTMLElement>("#status")!;
const diagramEl = document.querySelector<HTMLElement>("#diagram")!;
const cardTitle = document.querySelector<HTMLElement>("#card-title")!;
const cardFile = document.querySelector<HTMLElement>("#card-file")!;
const warningsEl = document.querySelector<HTMLElement>("#warnings")!;
const chooser = document.querySelector<HTMLDialogElement>("#chooser")!;
const chooserTitle = document.querySelector<HTMLElement>("#chooser-title")!;
const chooserOptions = document.querySelector<HTMLUListElement>("#chooser-options")!;

let groups: LoadedGroup[] = [];
let index: DefinitionIndex = new Map();
let renderSeq = 0;

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const colorScheme = (): ColorScheme => (darkQuery.matches ? "dark" : "light");

mermaid.initialize(mermaidConfig(colorScheme()));
darkQuery.addEventListener("change", () => {
  mermaid.initialize(mermaidConfig(colorScheme()));
  const loc = readLocation();
  if (loc.group) void show(loc.group, loc.entity);
});

function readLocation(): { group?: string; entity?: string } {
  const params = new URLSearchParams(location.hash.slice(1));
  return { group: params.get("g") ?? undefined, entity: params.get("e") ?? undefined };
}

function navigate(group: string, entity?: string) {
  const params = new URLSearchParams({ g: group });
  if (entity) params.set("e", entity);
  const hash = `#${params}`;
  if (location.hash === hash) void show(group, entity);
  else location.hash = hash;
}

function setStatus(message: string | null, kind: "info" | "error" = "info") {
  statusEl.hidden = message === null;
  statusEl.textContent = message ?? "";
  statusEl.classList.toggle("error", kind === "error");
}

async function show(groupName: string, entity?: string) {
  const group = groups.find((g) => g.name === groupName);
  if (!group) {
    diagramEl.replaceChildren();
    cardTitle.textContent = "—";
    cardFile.textContent = "";
    setStatus(`グループ「${groupName}」は見つかりません。上の一覧から選んでください。`, "error");
    groupSelect.value = "";
    return;
  }
  groupSelect.value = group.name;
  cardTitle.textContent = group.name;
  cardFile.textContent = group.file ?? "";
  document.title = `${group.name} — ER ビューア`;

  const seq = ++renderSeq;
  setStatus("図を描画しています…");
  try {
    const { svg } = await mermaid.render(renderId(seq), group.source);
    if (seq !== renderSeq) return;
    diagramEl.innerHTML = svg;
    setStatus(null);
  } catch (err) {
    if (seq !== renderSeq) return;
    diagramEl.replaceChildren();
    setStatus(`図を描画できませんでした: ${(err as Error).message}`, "error");
    return;
  }

  decorateLinks(resolveLinks(group, index));
  if (entity) revealEntity(entity);
  else viewport.scrollTo({ top: 0, left: 0 });
}

function renderId(seq: number): string {
  return `er-${seq}`;
}

function entityNodes(): Map<string, SVGGElement> {
  const nodes = new Map<string, SVGGElement>();
  for (const node of diagramEl.querySelectorAll<SVGGElement>("g.node[id]")) {
    const id = entityIdFromNodeId(node.id, renderId(renderSeq));
    if (id !== null) nodes.set(id, node);
  }
  return nodes;
}

function decorateLinks(links: Map<string, LinkTarget>) {
  for (const [id, node] of entityNodes()) {
    const target = links.get(id);
    if (!target) continue;
    const description =
      target.kind === "single"
        ? `${id} — グループ「${target.group}」の定義へ移動`
        : `${id} — 定義しているグループが複数あります（${target.groups.join("、")}）`;
    node.classList.add("er-link");
    node.setAttribute("role", "link");
    node.setAttribute("tabindex", "0");
    node.setAttribute("aria-label", description);
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = description;
    node.prepend(title);

    const activate = () => follow(id, target);
    node.addEventListener("click", activate);
    node.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate();
      }
    });
  }
}

function follow(entity: string, target: LinkTarget) {
  if (target.kind === "single") {
    navigate(target.group, entity);
    return;
  }
  chooserTitle.textContent = `「${entity}」の移動先`;
  chooserOptions.replaceChildren(
    ...target.groups.map((name) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chooser-option";
      const label = document.createElement("span");
      label.className = "chooser-option-name";
      label.textContent = name;
      const hint = document.createElement("span");
      hint.className = "chooser-option-hint";
      hint.textContent = "このグループの図へ移動";
      const arrow = document.createElement("span");
      arrow.className = "chooser-option-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "→";
      const text = document.createElement("span");
      text.className = "chooser-option-text";
      text.append(label, hint);
      button.append(text, arrow);
      button.addEventListener("click", () => {
        chooser.close();
        navigate(name, entity);
      });
      li.append(button);
      return li;
    }),
  );
  chooser.showModal();
}

function revealEntity(entity: string) {
  const node = entityNodes().get(entity);
  if (!node) return;
  node.classList.add("er-target");
  node.parentNode?.append(node);
  const box = node.getBoundingClientRect();
  const view = viewport.getBoundingClientRect();
  viewport.scrollTo({
    left: viewport.scrollLeft + box.left - view.left - (view.width - box.width) / 2,
    top: viewport.scrollTop + box.top - view.top - (view.height - box.height) / 2,
    behavior: reducedMotion.matches ? "auto" : "smooth",
  });
}

function showWarnings(warnings: string[]) {
  warningsEl.hidden = warnings.length === 0;
  warningsEl.replaceChildren(
    ...warnings.map((w) => {
      const p = document.createElement("p");
      p.textContent = w;
      return p;
    }),
  );
}

async function init() {
  let bundle: DiagramBundle;
  try {
    const res = await fetch("diagrams.json", { cache: "no-store" });
    if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
    bundle = (await res.json()) as DiagramBundle;
  } catch (err) {
    groupSelect.replaceChildren(new Option("—", ""));
    setStatus(`図の一覧を読み込めませんでした。${(err as Error).message}`, "error");
    return;
  }

  showWarnings(bundle.warnings);
  groups = loadGroups(bundle.groups);
  index = buildDefinitionIndex(groups);

  if (groups.length === 0) {
    groupSelect.replaceChildren(new Option("—", ""));
    setStatus("表示できる図がありません。ER_DIAGRAMS で図の置き場所（ディレクトリまたはマニフェスト）を指定してください。");
    return;
  }

  groupSelect.replaceChildren(
    new Option("グループを選択", "", false, false),
    ...groups.map((g) => new Option(g.name, g.name)),
  );
  groupSelect.options[0].disabled = true;
  groupSelect.disabled = false;
  groupSelect.addEventListener("change", () => navigate(groupSelect.value));
  window.addEventListener("hashchange", () => {
    const loc = readLocation();
    if (loc.group) void show(loc.group, loc.entity);
  });

  const loc = readLocation();
  if (loc.group) void show(loc.group, loc.entity);
  else navigate(groups[0].name);
}

void init();
