const injected = new Set<string>();

export function injectStyleSheet(id: string, css: string): void {
  if (injected.has(id)) return;
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }
  injected.add(id);
}
