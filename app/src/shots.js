// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos
// loaded; ?shot=cover shows the cover alone, full frame. Query params:
// photo (sample name), caption (subtitle), title, layout, grade, size.
// window.__shotReady is set once the scene has painted.
export async function runShot(shot, query, load) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const opts = {
    layout: query.get('layout') || undefined,
    grade: query.get('grade') || undefined,
    size: query.get('size') || undefined,
    title: query.get('title') || undefined,
  };
  await load(
    query.get('photo') ?? 'pier',
    query.get('caption') ?? 'one last ride down the boulevard',
    opts,
  );
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
