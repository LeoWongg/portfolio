const baseURL = new URL('./', import.meta.url);
const pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'resume/', title: 'Resume' },
  { url: 'https://github.com/LeoWongg', title: 'GitHub' },
];

const nav = document.createElement('nav');
nav.setAttribute('aria-label', 'Main navigation');
document.body.prepend(nav);

for (const page of pages) {
  const link = document.createElement('a');
  link.href = new URL(page.url, baseURL);
  link.textContent = page.title;

  const currentPath = location.pathname.replace(/index\.html$/, '');
  if (link.host === location.host && link.pathname === currentPath) {
    link.classList.add('current');
    link.setAttribute('aria-current', 'page');
  }

  if (link.host !== location.host) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }

  nav.append(link);
}

document.body.insertAdjacentHTML('afterbegin', `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
`);

const select = document.querySelector('.color-scheme select');

function setColorScheme(value) {
  document.documentElement.style.setProperty('color-scheme', value);
  select.value = value;
}

try {
  const saved = localStorage.getItem('colorScheme');
  if (['light dark', 'light', 'dark'].includes(saved)) {
    setColorScheme(saved);
  }
} catch (error) {
  console.error('Could not read the saved theme:', error);
}

select.addEventListener('input', (event) => {
  setColorScheme(event.target.value);
  try {
    localStorage.setItem('colorScheme', event.target.value);
  } catch (error) {
    console.error('Could not save the theme:', error);
  }
});

export async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
    return null;
  }
}

function escapeHTML(value) {
  const element = document.createElement('span');
  element.textContent = value;
  return element.innerHTML;
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  if (!(containerElement instanceof Element)) {
    return;
  }

  containerElement.innerHTML = '';

  if (!Array.isArray(projects)) {
    containerElement.textContent = 'Projects could not be loaded. Please try again later.';
    return;
  }

  if (projects.length === 0) {
    containerElement.textContent = 'No projects to display yet.';
    return;
  }

  if (!/^h[1-6]$/.test(headingLevel)) {
    headingLevel = 'h2';
  }

  for (const project of projects) {
    const article = document.createElement('article');
    const title = project.title || 'Untitled project';

    article.innerHTML = `
      <${headingLevel}>${escapeHTML(title)}</${headingLevel}>
      <img alt="" loading="lazy" width="640" height="360">
      <div>
        <p>${escapeHTML(project.description || 'Description coming soon.')}</p>
        <p class="project-year">${escapeHTML(project.year ?? 'Year not listed')}</p>
      </div>
    `;

    const image = article.querySelector('img');
    const fallback = new URL('images/project.svg', baseURL).href;
    image.src = new URL(project.image || fallback, baseURL).href;
    image.alt = project.imageAlt || `Preview for ${title}`;
    image.addEventListener('error', () => {
      image.src = fallback;
      image.alt = 'Project preview coming soon';
    }, { once: true });

    containerElement.append(article);
  }
}

export function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${encodeURIComponent(username)}`);
}
