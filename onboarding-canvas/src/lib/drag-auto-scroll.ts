const EDGE_THRESHOLD_PX = 56;
const MIN_SPEED = 4;
const MAX_SPEED = 18;

let active = false;
let onDragOver: ((event: DragEvent) => void) | null = null;

function scrollSpeedForEdgeDistance(distanceIntoEdge: number): number {
  const ratio = Math.min(1, Math.max(0, distanceIntoEdge / EDGE_THRESHOLD_PX));
  return Math.round(MIN_SPEED + ratio * (MAX_SPEED - MIN_SPEED));
}

function isVerticallyScrollable(element: HTMLElement): boolean {
  const { overflowY } = getComputedStyle(element);
  if (overflowY !== "auto" && overflowY !== "scroll" && overflowY !== "overlay") {
    return false;
  }
  return element.scrollHeight > element.clientHeight + 1;
}

function scrollElementVertically(element: HTMLElement, clientY: number): void {
  const rect = element.getBoundingClientRect();
  if (clientY < rect.top + EDGE_THRESHOLD_PX) {
    const distance = rect.top + EDGE_THRESHOLD_PX - clientY;
    element.scrollTop -= scrollSpeedForEdgeDistance(distance);
  } else if (clientY > rect.bottom - EDGE_THRESHOLD_PX) {
    const distance = clientY - (rect.bottom - EDGE_THRESHOLD_PX);
    element.scrollTop += scrollSpeedForEdgeDistance(distance);
  }
}

function scrollWindowVertically(clientY: number): void {
  if (clientY < EDGE_THRESHOLD_PX) {
    window.scrollBy(0, -scrollSpeedForEdgeDistance(EDGE_THRESHOLD_PX - clientY));
  } else if (clientY > window.innerHeight - EDGE_THRESHOLD_PX) {
    window.scrollBy(
      0,
      scrollSpeedForEdgeDistance(clientY - (window.innerHeight - EDGE_THRESHOLD_PX)),
    );
  }
}

function handleDragOver(event: DragEvent): void {
  const clientY = event.clientY;
  const clientX = event.clientX;
  scrollWindowVertically(clientY);

  const target = document.elementFromPoint(clientX, clientY);
  const scrolled = new Set<HTMLElement>();
  let node: HTMLElement | null = target instanceof HTMLElement ? target : null;
  while (node) {
    if (!scrolled.has(node) && isVerticallyScrollable(node)) {
      scrolled.add(node);
      scrollElementVertically(node, clientY);
    }
    node = node.parentElement;
  }
}

/** Scroll window and overflow containers while dragging near top/bottom edges. */
export function enableDragAutoScroll(): void {
  if (active) return;
  active = true;
  onDragOver = handleDragOver;
  document.addEventListener("dragover", onDragOver);
}

export function disableDragAutoScroll(): void {
  if (!active || !onDragOver) return;
  document.removeEventListener("dragover", onDragOver);
  active = false;
  onDragOver = null;
}
