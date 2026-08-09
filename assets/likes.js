(function () {
  // Set this to your deployed Worker URL — see blog-likes-worker/README.md
  const API_BASE = 'https://blog-likes.navidmirnourilikes.workers.dev';

  const widget = document.querySelector('.like-widget');
  if (!widget) return;

  const slug = widget.dataset.slug;
  const btn = widget.querySelector('.like-btn');
  const icon = btn.querySelector('i');
  const countEl = widget.querySelector('.like-count');
  const storageKey = `liked:${slug}`;

  function render(count, liked) {
    countEl.textContent = count;
    btn.classList.toggle('liked', liked);
    btn.setAttribute('aria-pressed', liked ? 'true' : 'false');
    icon.className = liked ? 'fas fa-heart' : 'far fa-heart';
  }

  fetch(`${API_BASE}/api/likes/${encodeURIComponent(slug)}`)
    .then((r) => r.json())
    .then((data) => render(data.count, localStorage.getItem(storageKey) === '1'))
    .catch(() => {
      countEl.textContent = '—';
    });

  btn.addEventListener('click', () => {
    const alreadyLiked = localStorage.getItem(storageKey) === '1';
    const action = alreadyLiked ? 'unlike' : 'like';

    btn.disabled = true;
    fetch(`${API_BASE}/api/likes/${encodeURIComponent(slug)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
      .then((r) => r.json())
      .then((data) => {
        localStorage.setItem(storageKey, alreadyLiked ? '0' : '1');
        render(data.count, !alreadyLiked);
      })
      .catch(() => {})
      .finally(() => {
        btn.disabled = false;
      });
  });
})();
