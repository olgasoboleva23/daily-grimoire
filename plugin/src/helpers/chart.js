// Palette color for charts, read from the _tokens.scss custom props so
// charts follow re-theming. Returns an rgba() string Chart.js accepts.
export function chartColor(token, alpha = 1) {
  const root = document.querySelector(
    '.workspace-leaf-content[data-type="winx"], .block-language-winx')
    ?? document.body;
  const palette = root.shadowRoot?.querySelector(".ui-view")
    ?? root.querySelector(".ui-host")?.shadowRoot?.querySelector(".ui-view") ?? root;
  const hex = getComputedStyle(palette).getPropertyValue(token).trim();
  const m = hex.match(/^#?([0-9a-f]{6})$/i);

  if (!m) return `rgba(150, 150, 150, ${alpha})`;
  const n = parseInt(m[1], 16);

  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// Chart.js doesn't inherit CSS colours, including the labels and grid around its data.
export const chartScale = () => ({
  ticks: { color: chartColor("--ui-chart-text"),
    backdropColor: chartColor("--ui-surface", 0.75) },
  grid: { color: chartColor("--ui-chart-grid", 0.1) },
});
