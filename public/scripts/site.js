const root = document.documentElement;
const themeToggle = document.querySelector('[data-theme-toggle]');
const searchToggle = document.querySelector('[data-search-toggle]');
const searchPanel = document.querySelector('[data-search-panel]');
const searchInput = document.querySelector('[data-search-input]');
const searchEmpty = document.querySelector('[data-search-empty]');
const menuToggle = document.querySelector('[data-menu-toggle]');
const mobileNav = document.querySelector('[data-mobile-nav]');
const siteAnnouncement = document.querySelector('[data-site-announcement]');
const announcementClose = document.querySelector('[data-announcement-close]');

if (siteAnnouncement) {
  const announcementKey = siteAnnouncement.dataset.announcementKey;

  try {
    if (localStorage.getItem('ggnews-dismissed-announcement') === announcementKey) {
      siteAnnouncement.hidden = true;
    }
  } catch {
    // The announcement remains visible when storage is unavailable.
  }

  announcementClose?.addEventListener('click', () => {
    siteAnnouncement.hidden = true;

    try {
      localStorage.setItem('ggnews-dismissed-announcement', announcementKey);
    } catch {
      // Dismissal still works for the current page without local storage.
    }
  });
}

themeToggle?.addEventListener('click', () => {
  const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = theme;
  localStorage.setItem('ggnews-theme', theme);
});

searchToggle?.addEventListener('click', () => {
  const shouldOpen = searchPanel.hidden;
  searchPanel.hidden = !shouldOpen;
  searchToggle.setAttribute('aria-expanded', String(shouldOpen));
  if (shouldOpen) window.setTimeout(() => searchInput?.focus(), 40);
});

menuToggle?.addEventListener('click', () => {
  const shouldOpen = mobileNav.hidden;
  mobileNav.hidden = !shouldOpen;
  menuToggle.setAttribute('aria-expanded', String(shouldOpen));
});

mobileNav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mobileNav.hidden = true;
    menuToggle?.setAttribute('aria-expanded', 'false');
  });
});

searchInput?.addEventListener('input', (event) => {
  const query = event.target.value.trim().toLocaleLowerCase('he');
  const stories = [...document.querySelectorAll('[data-searchable]')];
  let matches = 0;

  stories.forEach((story) => {
    const content = story.dataset.searchable.toLocaleLowerCase('he');
    const visible = !query || content.includes(query);
    story.hidden = !visible;
    if (visible) matches += 1;
  });

  if (searchEmpty) searchEmpty.hidden = matches > 0;
});

const initialQuery = new URLSearchParams(window.location.search).get('q')?.trim();
if (initialQuery && searchInput) {
  searchInput.value = initialQuery;
  searchInput.dispatchEvent(new Event('input'));
}
