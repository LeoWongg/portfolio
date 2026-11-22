const d3 = window.d3;
const tooltip = document.querySelector('#commit-tooltip');
const width = 640;
const height = 340;
const margin = { top: 18, right: 18, bottom: 44, left: 44 };
const colors = d3.scaleOrdinal()
  .domain(['html', 'css', 'js', 'json', 'py'])
  .range(['#b85c28', '#377eb8', '#877329', '#9765b0', '#26856d']);
let commits = [];
let selectedIds = new Set();
let brush;
let brushGroup;
let svg;
let xScale;
let yScale;
let rScale;
let timeScale;
let commitMaxTime;

function formatDate(commit) {
  return `${commit.date} at ${commit.time.slice(0, 5)} (${commit.timezone})`;
}

function hideTooltip() {
  tooltip.hidden = true;
}

function showTooltip(event, commit) {
  tooltip.replaceChildren();
  for (const text of [commit.message, formatDate(commit), `${commit.totalLines} current lines · ${commit.files} files`, `Commit ${commit.id.slice(0, 8)}`]) {
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    tooltip.append(paragraph);
  }
  tooltip.hidden = false;
  const target = event.currentTarget.getBoundingClientRect();
  const left = event.clientX || target.right;
  const top = event.clientY || target.top;
  tooltip.style.left = `${Math.max(8, Math.min(left + 14, innerWidth - tooltip.offsetWidth - 12))}px`;
  tooltip.style.top = `${Math.max(8, Math.min(top + 14, innerHeight - tooltip.offsetHeight - 12))}px`;
}

function makeChart() {
  const extent = d3.extent(commits, d => d.datetime);
  // Keep both controls usable even when all surviving lines belong to one commit.
  const last = +extent[0] === +extent[1] ? new Date(+extent[1] + 3600000) : extent[1];
  timeScale = d3.scaleTime().domain([extent[0], last]).range([0, 100]);
  xScale = d3.scaleTime().domain([extent[0], last]).range([margin.left, width - margin.right]);
  yScale = d3.scaleLinear().domain([0, 24]).range([height - margin.bottom, margin.top]);
  rScale = d3.scaleSqrt().domain([0, d3.max(commits, d => d.totalLines)]).range([0, 22]);
  svg = d3.select('#chart').append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('role', 'group').attr('aria-label', 'Commit dates and local times of day');
  svg.append('g').attr('class', 'grid')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(yScale).ticks(4).tickSize(-(width - margin.left - margin.right)).tickFormat(''));
  svg.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${height - margin.bottom})`);
  svg.append('g').attr('class', 'y-axis').attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(yScale).ticks(4).tickFormat(d => `${String(d).padStart(2, '0')}:00`));
  svg.append('text').attr('x', width / 2).attr('y', height - 5)
    .attr('text-anchor', 'middle').attr('fill', 'currentColor').attr('font-size', 13).text('Commit date');
  brush = d3.brush().extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
    .on('start brush end', onBrush);
  brushGroup = svg.append('g').attr('class', 'brush').call(brush);
  svg.append('g').attr('class', 'dots');
}

function onBrush({ selection }) {
  selectedIds = new Set();
  if (selection) {
    const [[x0, y0], [x1, y1]] = selection;
    for (const commit of commits.filter(d => d.datetime <= commitMaxTime)) {
      if (x0 <= xScale(commit.datetime) && xScale(commit.datetime) <= x1 &&
          y0 <= yScale(commit.hourFrac) && yScale(commit.hourFrac) <= y1) selectedIds.add(commit.id);
    }
  }
  svg.selectAll('.dots circle').classed('selected', d => selectedIds.has(d.id));
  const selected = commits.filter(d => selectedIds.has(d.id));
  document.querySelector('#selection-count').textContent = selected.length ? `${selected.length} commit${selected.length === 1 ? '' : 's'} selected` : 'No commits selected';
  const counts = d3.rollups(selected.flatMap(d => d.lines), rows => rows.length, d => d.type);
  document.querySelector('#language-breakdown').textContent = counts.map(([type, count]) => `${type.toUpperCase()}: ${count} lines`).join(' · ');
}

function updateStats(filtered) {
  const lines = filtered.flatMap(d => d.lines);
  const stats = [
    { label: 'Commits', value: filtered.length },
    { label: 'Files', value: new Set(lines.map(d => d.file)).size },
    { label: 'Lines', value: lines.length },
  ];
  const groups = d3.select('#stats').selectAll('div').data(stats, d => d.label).join(enter => {
    const div = enter.append('div');
    div.append('dt');
    div.append('dd');
    return div;
  });
  groups.select('dt').text(d => d.label);
  groups.select('dd').text(d => d3.format(',')(d.value));
}

function updateScatterPlot(filtered) {
  hideTooltip();
  if (brushGroup) brushGroup.call(brush.move, null);
  const first = timeScale.domain()[0];
  xScale.domain([first, new Date(Math.max(+commitMaxTime, +first + 3600000))]);
  svg.select('.x-axis').call(d3.axisBottom(xScale).ticks(4));
  svg.select('.dots').selectAll('circle')
    .data(d3.sort(filtered, d => -d.totalLines), d => d.id)
    .join('circle')
    .attr('cx', d => xScale(d.datetime)).attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => Math.max(4, rScale(d.totalLines)))
    .attr('tabindex', 0).attr('role', 'img')
    .attr('aria-label', d => `${d.message}, ${formatDate(d)}, ${d.totalLines} lines`)
    .on('mouseenter focus', showTooltip).on('mouseleave blur', hideTooltip)
    .on('keydown', event => { if (event.key === 'Escape') hideTooltip(); });
  updateStats(filtered);
}

function updateFileDisplay(filtered) {
  const lines = filtered.flatMap(d => d.lines);
  const files = d3.groups(lines, d => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length || a.name.localeCompare(b.name));
  const rows = d3.select('#files').selectAll('.file-row').data(files, d => d.name)
    .join(enter => {
      const row = enter.append('div').attr('class', 'file-row');
      const dt = row.append('dt');
      dt.append('code');
      dt.append('small');
      row.append('dd');
      return row;
    }).order();
  rows.select('code').text(d => d.name);
  rows.select('small').text(d => `${d.lines.length} lines`);
  rows.select('dd').attr('aria-label', d => `${d.lines.length} lines in ${d.name}`)
    .selectAll('.loc').data(d => d.lines, d => `${d.file}:${d.line}`)
    .join('div').attr('class', 'loc').attr('aria-hidden', true)
    .style('--color', d => colors(d.type));
  document.querySelector('#file-summary').textContent = `${d3.format(',')(lines.length)} lines across ${files.length} files`;
}

function setTime(date) {
  commitMaxTime = date;
  document.querySelector('#commit-progress').value = timeScale(date);
  const closest = commits.filter(d => d.datetime <= date).at(-1);
  const time = document.querySelector('#commit-time');
  time.dateTime = date.toISOString();
  time.textContent = closest ? formatDate(closest) : date.toLocaleString();
  updateScatterPlot(commits.filter(d => d.datetime <= date));
}

function setFileTime(date) {
  document.querySelector('#file-progress').value = timeScale(date);
  const closest = commits.filter(d => d.datetime <= date).at(-1);
  const time = document.querySelector('#file-time');
  time.dateTime = date.toISOString();
  time.textContent = closest ? `Through ${formatDate(closest)}` : date.toLocaleString();
  updateFileDisplay(commits.filter(d => d.datetime <= date));
}

async function main() {
  const data = await d3.csv('loc.csv', d => ({
    ...d, line: +d.line, depth: +d.depth, length: +d.length, datetime: new Date(d.datetime),
  }));
  if (!data.length) throw new Error('No source history is available.');
  commits = d3.groups(data, d => d.commit).map(([id, lines]) => {
    const first = lines[0];
    const [hour, minute, second] = first.time.split(':').map(Number);
    return { ...first, id, lines, totalLines: lines.length,
      files: new Set(lines.map(d => d.file)).size,
      hourFrac: hour + minute / 60 + second / 3600,
      url: `https://github.com/LeoWongg/portfolio/commit/${id}` };
  }).sort((a, b) => a.datetime - b.datetime || a.id.localeCompare(b.id));
  document.querySelector('#load-status').hidden = true;
  document.querySelector('#scrolly-1').hidden = false;
  document.querySelector('#file-section').hidden = false;
  makeChart();
  const steps = d3.select('#scatter-story').selectAll('.step').data(commits, d => d.id)
    .join('article').attr('class', 'step');
  steps.append('time').attr('datetime', d => d.datetime.toISOString()).text(formatDate);
  steps.append('h3').text(d => d.message);
  steps.append('p').text(d => `${d.totalLines} ${d.totalLines === 1 ? 'line' : 'lines'} across ${d.files} ${d.files === 1 ? 'file' : 'files'} in today's source ${d.totalLines === 1 ? 'was' : 'were'} last changed in this commit.`);
  steps.append('a').attr('class', 'commit-id').attr('href', d => d.url)
    .attr('target', '_blank').attr('rel', 'noopener noreferrer').text(d => `View commit ${d.id.slice(0, 8)}`);
  const legend = d3.select('#file-legend').selectAll('span.legend-item')
    .data([...new Set(data.map(d => d.type))].sort()).join('span').attr('class', 'legend-item');
  legend.append('span').attr('class', 'swatch').style('--color', d => colors(d)).attr('aria-hidden', true);
  legend.append('span').text(d => d.toUpperCase());
  setTime(timeScale.invert(100));
  setFileTime(timeScale.invert(100));
  document.querySelector('#commit-progress').addEventListener('input', event => {
    const date = timeScale.invert(+event.target.value);
    setTime(date);
    setFileTime(date);
    steps.classed('active', false);
  });
  document.querySelector('#file-progress').addEventListener('input', event => setFileTime(timeScale.invert(+event.target.value)));
  let activeStepId;
  function syncStory() {
    // Large scroll jumps can cross an entire step between observer callbacks.
    const passed = steps.nodes().filter(element => element.getBoundingClientRect().top <= innerHeight * 0.6);
    const element = passed.at(-1);
    if (!element || element.__data__.id === activeStepId) return;
    activeStepId = element.__data__.id;
    steps.classed('active', function () { return this === element; });
    setTime(element.__data__.datetime);
    setFileTime(element.__data__.datetime);
  }
  const scroller = window.scrollama();
  scroller.setup({ step: '#scrolly-1 .step', offset: 0.6 })
    .onStepEnter(syncStory);
  let framePending = false;
  addEventListener('scroll', () => {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(() => { framePending = false; syncStory(); });
  }, { passive: true });
  addEventListener('resize', () => { scroller.resize(); hideTooltip(); });
}

main().catch(error => {
  console.error(error);
  document.querySelector('#load-status').textContent = 'The repository history could not load. Please reload the page.';
});
