// Deterministic screenshot scene driver (?shot=cover | ?shot=editor).

export async function applyShotParams(shot, query, actions) {
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
  }

  const size = query.get('size');
  if (size && /^\d+x\d+$/.test(size)) {
    actions.setSize(size);
  }

  const layout = query.get('layout');
  if (layout) actions.setLayout(layout);

  const grade = query.get('grade');
  if (grade) actions.setGrade(grade);

  const caption = query.get('caption');
  if (caption !== null) actions.setCaption(caption);

  const sub = query.get('sub');
  if (sub !== null) actions.setSubcaption(sub);

  const pos = query.get('pos');
  if (pos) actions.setCaptionPos(pos);

  const color = query.get('color');
  if (color) actions.setCaptionColor(color);

  const primary = query.get('photo') || 'pier';
  const secondary = query.get('photo2') || (primary === 'pier' ? 'boulevard' : 'pier');
  await actions.loadSamplePair(primary, secondary);

  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  actions.render(shot === 'cover');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.__shotReady = true;
    });
  });
}
