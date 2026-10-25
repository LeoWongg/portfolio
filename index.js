import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

async function loadProjects() {
  const projects = await fetchJSON('./lib/projects.json');
  const latestProjects = Array.isArray(projects) ? projects.slice(0, 3) : projects;
  renderProjects(latestProjects, document.querySelector('.projects'), 'h3');
}

async function loadGitHubStats() {
  const profileStats = document.querySelector('#profile-stats');
  if (!profileStats) {
    return;
  }

  const githubData = await fetchGitHubData('LeoWongg');
  if (!githubData) {
    profileStats.textContent = 'GitHub stats are unavailable right now. Please try again later.';
    return;
  }

  profileStats.innerHTML = `
    <dl>
      <dt>Public repos</dt><dd>${githubData.public_repos}</dd>
      <dt>Public gists</dt><dd>${githubData.public_gists}</dd>
      <dt>Followers</dt><dd>${githubData.followers}</dd>
      <dt>Following</dt><dd>${githubData.following}</dd>
    </dl>
  `;
}

await Promise.all([loadProjects(), loadGitHubStats()]);
