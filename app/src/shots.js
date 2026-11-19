// Fixed scenes for screenshots: ?shot=editor shows the editor with a sample
// photo loaded; ?shot=cover shows the cover alone. `photo` picks the sample
// (samples/<photo>.jpg), `caption` the title words, `layout` and `grade` the
// look. window.__shotReady is set once the scene has painted.
export async function runShot(shot, query, api) {
  const caption = query.get('caption') ?? 'Sunset Heist';
  const subtitle = query.get('subtitle') ?? 'Vice Nights';
  const layout = query.get('layout') ?? 'trio';
  const grade = query.get('grade') ?? 'sunset';
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const w = Number(query.get('w') ?? 1080) || 1080;
    const h = Number(query.get('h') ?? 1080) || 1080;
    api.setExportSize(w, h);
    api.setLayout(layout);
    api.setGrade(grade);
    await api.loadSample(query.get('photo') ?? 'pier');
    await api.loadSample(query.get('photo2') ?? 'boulevard');
    api.setCaption(caption, subtitle);
    api.redraw();
  } else if (shot === 'editor') {
    api.setExportSize(1080, 1080);
    api.setLayout(layout);
    api.setGrade(grade);
    await api.loadSample(query.get('photo') ?? 'pier');
    api.setCaption(caption, subtitle);
    api.redraw();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
