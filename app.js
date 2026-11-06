const views = [...document.querySelectorAll('[data-view]')];
const viewLinks = [...document.querySelectorAll('[data-view-link]')];
const authViews = [...document.querySelectorAll('[data-auth-view]')];
const authShell = document.querySelector('#auth-shell');
const appLayout = document.querySelector('#app-layout');
const breadcrumbCurrent = document.querySelector('#breadcrumb-current');
const historySearch = document.querySelector('#history-search');
const historySort = document.querySelector('#history-sort');
const sessionKey = 'compare.demoUser';
const viewNames = { dashboard: 'Dashboard', 'new-comparison': 'New comparison', 'previous-comparisons': 'Previous comparisons', 'comparison-results': 'Comparison results' };
const authNames = { login: 'Log in', 'sign-up': 'Create account', 'reset-password': 'Reset password' };
const categoryStyles = { Education: 'purple', Products: '$', Teams: 'green', Personal: 'orange', Projects: 'blue', Fitness: 'green', Food: 'orange', Technology: 'purple' };
const categoryInitials = { Education: 'Aa', Products: '$', Teams: 'T', Personal: 'H', Projects: 'P', Fitness: 'F', Food: 'R', Technology: 'L' };

let activeChartVariableName = '';
let editingComparisonId = null;

function getDemoUser() {
  try { return JSON.parse(sessionStorage.getItem(sessionKey) || 'null'); }
  catch { return null; }
}

function comparisonKey(user) {
  return `compare.demoComparisons.${encodeURIComponent(user.email.toLowerCase())}`;
}

function makeComparison(id, title, category, groupName, variables, rows, hoursAgo) {
  const updatedAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
  const items = rows.map(([name, ...values]) => ({
    name,
    values: Object.fromEntries(variables.map((variable, index) => [variable.name, values[index]])),
  }));
  return { id, title, category, groupName, variables, items, updatedAt };
}

function sampleComparisons() {
  return [
    makeComparison('student-results', 'Student test results', 'Education', 'students', [
      { name: 'Math marks', unit: 'marks' }, { name: 'Science marks', unit: 'marks' }, { name: 'English marks', unit: 'marks' },
    ], [
      ['Alice', 88, 92, 91], ['Ben', 78, 84, 80], ['Chloe', 94, 89, 96], ['Dev', 84, 81, 87],
    ], 1),
    makeComparison('phone-prices', 'Phone price comparison', 'Products', 'phones', [
      { name: 'Price', unit: 'USD' }, { name: 'Battery life', unit: 'hours' },
    ], [
      ['Pixel 10', 699, 27], ['Galaxy S25', 799, 25], ['iPhone 17', 899, 24],
    ], 23),
    makeComparison('team-sprint', 'Team sprint scores', 'Teams', 'teams', [
      { name: 'Tasks completed', unit: 'tasks' }, { name: 'Points', unit: 'points' }, { name: 'Bugs found', unit: 'bugs' }, { name: 'Hours', unit: 'hours' },
    ], [
      ['Team A', 18, 42, 5, 36], ['Team B', 21, 38, 7, 40], ['Team C', 16, 45, 4, 34], ['Team D', 20, 40, 6, 38], ['Team E', 19, 41, 3, 37],
    ], 96),
    makeComparison('study-hours', 'Weekly study hours', 'Personal', 'people', [
      { name: 'Study time', unit: 'hours' },
    ], [
      ['Jordan', 12], ['Taylor', 15], ['Morgan', 9],
    ], 190),
    makeComparison('project-budgets', 'Project budget options', 'Projects', 'options', [
      { name: 'Cost', unit: 'USD' }, { name: 'Duration', unit: 'weeks' }, { name: 'Team size', unit: 'people' },
    ], [
      ['Option A', 12000, 8, 4], ['Option B', 9500, 10, 3], ['Option C', 14500, 6, 5],
    ], 4 * 24),
    makeComparison('running-shoes', 'Running shoe comparison', 'Products', 'shoes', [
      { name: 'Price', unit: 'USD' }, { name: 'Weight', unit: 'grams' },
    ], [
      ['Pace Pro', 140, 235], ['Road Flex', 115, 248], ['Cloud Run', 160, 221], ['Daily Move', 95, 260],
    ], 5 * 24),
    makeComparison('recipe-nutrition', 'Quick lunch ideas', 'Food', 'meals', [
      { name: 'Calories', unit: 'kcal' }, { name: 'Protein', unit: 'grams' }, { name: 'Prep time', unit: 'minutes' },
    ], [
      ['Chickpea bowl', 430, 21, 20], ['Egg toast', 390, 23, 12], ['Tofu wrap', 465, 28, 18],
    ], 8 * 24),
    makeComparison('laptop-battery', 'Laptop battery test', 'Technology', 'laptops', [
      { name: 'Battery life', unit: 'hours' }, { name: 'Weight', unit: 'kg' },
    ], [
      ['Notebook Air', 14, 1.2], ['WorkBook 14', 11, 1.5], ['Travel Pro', 16, 1.1],
    ], 14 * 24),
  ];
}

function loadComparisons(user) {
  const key = comparisonKey(user);
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (Array.isArray(saved)) return saved;
  } catch { /* Replace invalid demo data with the sample set. */ }
  const samples = sampleComparisons();
  saveComparisons(user, samples);
  return samples;
}

function selectedComparisonKey(user) { return `compare.demoSelected.${encodeURIComponent(user.email.toLowerCase())}`; }

function saveComparisons(user, comparisons) {
  localStorage.setItem(comparisonKey(user), JSON.stringify(comparisons));
}

// Expose a small browser-only data helper for later frontend phases.
window.comparisonStore = { list: loadComparisons, save: saveComparisons };

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function styleFor(category) { return categoryStyles[category] || 'blue'; }
function formatUpdatedAt(value) {
  const date = new Date(value);
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return `Today, ${new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date)}`;
  if (days === 1) return 'Yesterday';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function comparisonSummary(comparison) {
  const metric = comparison.variables[0];
  const numericValues = comparison.items.map((item) => Number(item.values[metric?.name])).filter(Number.isFinite);
  const average = numericValues.length ? numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length : 0;
  const unit = metric?.unit ? ` ${metric.unit}` : '';
  return { metric, average: `${Number.isInteger(average) ? average : average.toFixed(1)}${unit}`, numericValues };
}

function renderRecentCard(comparison) {
  const tone = styleFor(comparison.category);
  const summary = comparisonSummary(comparison);
  const max = Math.max(...summary.numericValues, 1);
  const bars = summary.numericValues.map((value) => {
    const height = Math.max(14, Math.round((value / max) * 100));
    return `<span style="height:${height}%"></span>`;
  }).join('');
  const itemsLabel = `${comparison.items.length} ${escapeHTML(comparison.groupName)}`;
  const metricName = summary.metric ? escapeHTML(summary.metric.name) : 'Values';
  const category = escapeHTML(comparison.category);
  const title = escapeHTML(comparison.title);
  return `<article class="comparison-card">
    <div class="comparison-card-top"><span class="comparison-type type-${tone}">${category}</span><span class="card-menu" aria-hidden="true">•••</span></div>
    <h3>${title}</h3><p class="comparison-meta">${itemsLabel} <span>·</span> ${comparison.variables.length} variables</p>
    <div class="mini-visual" role="img" aria-label="Average ${metricName}: ${escapeHTML(summary.average)} across ${comparison.items.length} items">
      <div class="mini-visual-label">Average ${metricName} <strong>${escapeHTML(summary.average)}</strong></div>
      <div class="mini-bars" aria-hidden="true">${bars}</div>
      <div class="mini-legend"><span><i class="legend-dot legend-purple"></i>${metricName}</span></div>
    </div>
    <div class="card-footer"><span>Updated ${escapeHTML(formatUpdatedAt(comparison.updatedAt))}</span><a href="#previous-comparisons" aria-label="Find ${title} in previous comparisons">View history <span aria-hidden="true">→</span></a></div>
  </article>`;
}

function renderDashboard(user) {
  const comparisons = loadComparisons(user).slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  const itemTotal = comparisons.reduce((total, comparison) => total + comparison.items.length, 0);
  document.querySelector('#comparison-count').textContent = String(comparisons.length);
  document.querySelector('#nav-count').textContent = String(comparisons.length);
  document.querySelector('#item-count').textContent = String(itemTotal);
  document.querySelector('.dashboard-heading .eyebrow').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
  const lastUpdatedValue = document.querySelector('.stat-value-date');
  const lastUpdatedLabel = document.querySelector('.stat-card:last-child .stat-foot span:last-child');
  if (comparisons[0]) {
    const lastUpdated = formatUpdatedAt(comparisons[0].updatedAt);
    lastUpdatedValue.textContent = lastUpdated.startsWith('Today') ? 'Today' : lastUpdated;
    lastUpdatedLabel.textContent = `${comparisons[0].title} · ${lastUpdated}`;
  } else {
    lastUpdatedValue.textContent = '—';
    lastUpdatedLabel.textContent = 'No saved comparisons yet';
  }
  const recent = document.querySelector('#recent-comparisons');
  recent.innerHTML = comparisons.length
    ? comparisons.slice(0, 2).map(renderRecentCard).join('')
    : '<div class="empty-state"><strong>No comparisons yet</strong><p>Create one manually or import a spreadsheet to see your results here.</p><a class="button button-primary" href="#new-comparison">Create comparison</a></div>';
}
function renderHistory(user) {
  const all = loadComparisons(user);
  const query = historySearch.value.trim().toLocaleLowerCase();
  const sort = historySort.value;
  const filtered = all.filter((comparison) => {
    const searchable = [comparison.title, comparison.category, ...comparison.variables.map((variable) => variable.name)].join(' ').toLocaleLowerCase();
    return searchable.includes(query);
  });
  filtered.sort((a, b) => {
    if (sort === 'name-asc') return a.title.localeCompare(b.title);
    if (sort === 'name-desc') return b.title.localeCompare(a.title);
    const timeDifference = new Date(a.updatedAt) - new Date(b.updatedAt);
    return sort === 'oldest' ? timeDifference : -timeDifference;
  });

  document.querySelector('#history-total').textContent = String(all.length);
  document.querySelector('#history-result-count').textContent = query
    ? `Showing ${filtered.length} of ${all.length} comparisons`
    : `Showing ${filtered.length} comparisons`;

  const body = document.querySelector('#history-body');
  if (!filtered.length) {
    const emptyMessage = all.length === 0
      ? 'No saved comparisons yet. Create one manually or import an Excel file.'
      : 'No comparisons match your search. Try another name or variable.';
    body.innerHTML = `<tr><td class="empty-history" colspan="6">${emptyMessage}</td></tr>`;
    return;
  }

  body.innerHTML = filtered.map((comparison) => {
    const tone = styleFor(comparison.category);
    const initials = categoryInitials[comparison.category] || comparison.category.slice(0, 1).toUpperCase();
    const title = escapeHTML(comparison.title);
    return `<tr>
      <td><span class="table-name-icon ${tone === 'purple' ? 'lavender' : tone === 'blue' ? 'sky' : tone === 'green' ? 'mint' : 'peach'}">${escapeHTML(initials)}</span><strong>${title}</strong></td>
      <td><span class="comparison-type type-${tone}">${escapeHTML(comparison.category)}</span></td>
      <td>${comparison.items.length} ${escapeHTML(comparison.groupName)}</td>
      <td>${comparison.variables.length} variables</td>
      <td>${escapeHTML(formatUpdatedAt(comparison.updatedAt))}</td>
      <td class="history-row-actions"><a class="row-open" href="#comparison-results" data-open-comparison="${escapeHTML(comparison.id)}">View results <span aria-hidden="true">→</span></a><details class="history-actions"><summary aria-label="Actions for ${title}">Actions</summary><div class="history-action-menu"><button type="button" data-history-action="edit" data-comparison-id="${escapeHTML(comparison.id)}">Edit</button><button type="button" data-history-action="rename" data-comparison-id="${escapeHTML(comparison.id)}">Rename</button><button type="button" data-history-action="duplicate" data-comparison-id="${escapeHTML(comparison.id)}">Duplicate</button><button type="button" data-history-action="excel" data-comparison-id="${escapeHTML(comparison.id)}">Download Excel</button><button type="button" title="Choose Save as PDF in your browser's print dialog" data-history-action="pdf" data-comparison-id="${escapeHTML(comparison.id)}">Save as PDF</button><button type="button" class="danger-action" data-history-action="delete" data-comparison-id="${escapeHTML(comparison.id)}">Delete</button></div></details></td>
    </tr>`;
  }).join('');
}


function downloadComparisonExcel(comparison) {
  if (!window.XLSX) {
    window.alert('The Excel download tool did not load. Check that vendor/xlsx.full.min.js is present, then reopen the page.');
    return;
  }
  const rows = [
    ['Comparison', comparison.title],
    ['Updated', new Date(comparison.updatedAt).toLocaleString()],
    [],
    ['Item', ...comparison.variables.map((variable) => variable.unit ? `${variable.name} (${variable.unit})` : variable.name)],
    ...comparison.items.map((item) => [item.name, ...comparison.variables.map((variable) => item.values[variable.name])]),
  ];
  const sheet = window.XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [{ wch: 26 }, ...comparison.variables.map((variable) => ({ wch: Math.max(16, Math.min(30, variable.name.length + (variable.unit?.length || 0) + 4)) }))];
  const workbook = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(workbook, sheet, 'Comparison');
  const safeName = comparison.title.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-').slice(0, 80) || 'comparison';
  window.XLSX.writeFile(workbook, `${safeName}.xlsx`);
}

function downloadComparisonPDF(comparison) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.alert('Allow pop-ups for this page to create a PDF print view.');
    return;
  }
  const headers = comparison.variables.map((variable) => `<th>${escapeHTML(variable.name)}${variable.unit ? `<span>${escapeHTML(variable.unit)}</span>` : ''}</th>`).join('');
  const rows = comparison.items.map((item) => `<tr><th scope="row">${escapeHTML(item.name)}</th>${comparison.variables.map((variable) => `<td>${escapeHTML(item.values[variable.name])}</td>`).join('')}</tr>`).join('');
  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHTML(comparison.title)}</title><style>body{font:14px Arial,sans-serif;color:#222;margin:36px}h1{font-size:22px;margin:0 0 7px}.meta{font-size:11px;color:#666;margin:0 0 22px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #d9dce3;padding:9px 11px;text-align:left}thead th{background:#f2f4f8;font-size:12px}tbody th{font-weight:600}thead th span{display:block;color:#687080;font-size:10px;font-weight:400;margin-top:3px}@media print{body{margin:16mm}}</style></head><body><h1>${escapeHTML(comparison.title)}</h1><p class="meta">${comparison.items.length} items · ${comparison.variables.length} variables · Updated ${escapeHTML(new Date(comparison.updatedAt).toLocaleString())}</p><table><thead><tr><th>Item</th>${headers}</tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>{window.focus();window.print()}<\/script></body></html>`);
  printWindow.document.close();
}

function handleHistoryAction(event) {
  const actionButton = event.target.closest('[data-history-action]');
  if (actionButton) {
    const user = getDemoUser();
    if (!user) return;
    const comparisonId = actionButton.dataset.comparisonId;
    const comparisons = window.comparisonStore.list(user);
    const index = comparisons.findIndex((comparison) => comparison.id === comparisonId);
    if (index < 0) return;
    const comparison = comparisons[index];
    switch (actionButton.dataset.historyAction) {
      case 'edit':
        editComparison(comparison.id);
        return;
      case 'rename': {
        const name = window.prompt('Enter a new name for this comparison:', comparison.title);
        if (name === null) return;
        const trimmedName = name.trim();
        if (!trimmedName) {
          window.alert('Comparison name cannot be empty.');
          return;
        }
        comparison.title = trimmedName;
        comparison.updatedAt = new Date().toISOString();
        window.comparisonStore.save(user, comparisons);
        renderWorkspace(user);
        return;
      }
      case 'duplicate': {
        const copy = { ...comparison, id: globalThis.crypto?.randomUUID?.() || `comparison-${Date.now()}`, title: `${comparison.title} (copy)`, variables: comparison.variables.map((variable) => ({ ...variable })), items: comparison.items.map((item) => ({ ...item, values: { ...item.values } })), updatedAt: new Date().toISOString() };
        comparisons.unshift(copy);
        window.comparisonStore.save(user, comparisons);
        renderWorkspace(user);
        return;
      }
      case 'delete': {
        if (!window.confirm(`Delete “${comparison.title}”? This cannot be undone.`)) return;
        comparisons.splice(index, 1);
        window.comparisonStore.save(user, comparisons);
        if (localStorage.getItem(selectedComparisonKey(user)) === comparison.id) {
          if (comparisons[0]) localStorage.setItem(selectedComparisonKey(user), comparisons[0].id);
          else localStorage.removeItem(selectedComparisonKey(user));
        }
        renderWorkspace(user);
        return;
      }
      case 'excel':
        downloadComparisonExcel(comparison);
        return;
      case 'pdf':
        downloadComparisonPDF(comparison);
        return;
    }
  }
  const link = event.target.closest('[data-open-comparison]');
  if (!link) return;
  const user = getDemoUser();
  if (!user) return;
  localStorage.setItem(selectedComparisonKey(user), link.dataset.openComparison);
  activeChartVariableName = '';
}
function renderWorkspace(user) {
  updateProfile(user);
  renderDashboard(user);
  renderHistory(user);
  renderResults(user);
}

function updateProfile(user) {
  const firstName = user.name.trim().split(/\s+/)[0] || 'there';
  document.querySelector('#user-greeting').textContent = firstName;
  document.querySelector('#sidebar-user-name').textContent = user.name;
  document.querySelector('#sidebar-avatar').textContent = initialsFor(user.name);
  document.querySelector('#topbar-avatar').textContent = initialsFor(user.name);
  document.querySelector('#topbar-avatar').setAttribute('aria-label', user.name);
}

function initialsFor(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
}

function showCurrentView() {
  const user = getDemoUser();
  const requestedView = window.location.hash.slice(1);
  if (!user) {
    const activeAuthView = authNames[requestedView] ? requestedView : 'login';
    authShell.hidden = false;
    appLayout.hidden = true;
    authViews.forEach((view) => { view.hidden = view.dataset.authView !== activeAuthView; });
    document.title = `${authNames[activeAuthView]} · Compare`;
    const authHeading = document.querySelector(`[data-auth-view="${activeAuthView}"] h1`);
    if (authHeading) {
      authHeading.setAttribute('tabindex', '-1');
      authHeading.focus({ preventScroll: true });
    }
    return;
  }
  if (!viewNames[requestedView]) window.history.replaceState(null, '', '#dashboard');
  const activeView = viewNames[requestedView] ? requestedView : 'dashboard';
  authShell.hidden = true;
  appLayout.hidden = false;
  views.forEach((view) => { view.hidden = view.dataset.view !== activeView; });
  viewLinks.forEach((link) => {
    const isActive = link.dataset.viewLink === activeView;
    link.classList.toggle('active', isActive);
    if (isActive) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  renderWorkspace(user);
  breadcrumbCurrent.textContent = viewNames[activeView];
  document.title = `${viewNames[activeView]} · Compare`;
  const pageHeading = document.querySelector(`#${activeView} h1`);
  if (pageHeading) {
    pageHeading.setAttribute('tabindex', '-1');
    pageHeading.focus({ preventScroll: true });
  }
}

document.querySelector('#login-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const email = String(data.get('email')).trim();
  const guessedName = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  sessionStorage.setItem(sessionKey, JSON.stringify({ name: guessedName || 'Demo user', email }));
  window.location.hash = '#dashboard';
  showCurrentView();
});

document.querySelector('#signup-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const name = String(data.get('name')).trim();
  const email = String(data.get('email')).trim();
  sessionStorage.setItem(sessionKey, JSON.stringify({ name, email }));
  window.location.hash = '#dashboard';
  showCurrentView();
});

document.querySelector('#reset-form').addEventListener('submit', (event) => {
  event.preventDefault();
  setMessage('reset-message', 'Demo only: no email was sent and no password was changed.');
});

document.querySelector('#logout-button').addEventListener('click', () => {
  sessionStorage.removeItem(sessionKey);
  window.location.hash = '#login';
  showCurrentView();
});

historySearch.addEventListener('input', () => renderHistory(getDemoUser()));
historySort.addEventListener('change', () => renderHistory(getDemoUser()));
window.addEventListener('hashchange', showCurrentView);

let entryState = {
  variables: [
    { id: 'variable-1', name: '', unit: '' },
    { id: 'variable-2', name: '', unit: '' },
  ],
  items: [
    { id: 'item-1', name: '', values: { 'variable-1': '', 'variable-2': '' } },
    { id: 'item-2', name: '', values: { 'variable-1': '', 'variable-2': '' } },
  ],
};
let nextEntryId = 3;

function syncEntryState() {
  document.querySelectorAll('[data-variable-name]').forEach((input) => {
    const variable = entryState.variables.find((item) => item.id === input.dataset.variableName);
    if (variable) variable.name = input.value;
  });
  document.querySelectorAll('[data-variable-unit]').forEach((input) => {
    const variable = entryState.variables.find((item) => item.id === input.dataset.variableUnit);
    if (variable) variable.unit = input.value;
  });
  document.querySelectorAll('[data-item-name]').forEach((input) => {
    const item = entryState.items.find((row) => row.id === input.dataset.itemName);
    if (item) item.name = input.value;
  });
  document.querySelectorAll('[data-item-value]').forEach((input) => {
    const item = entryState.items.find((row) => row.id === input.dataset.itemValue);
    const variable = entryState.variables.find((row) => row.id === input.dataset.variableId);
    if (item) item.values[input.dataset.variableId] = input.value;
    if (item && variable) input.setAttribute('aria-label', `${item.name || `Item ${entryState.items.indexOf(item) + 1}`}, ${variable.name || 'unnamed variable'} value`);
  });
}

function renderEntryTable() {
  const header = document.querySelector('#entry-table-head');
  const body = document.querySelector('#entry-table-body');
  if (!header || !body) return;
  header.innerHTML = '<th class="item-heading" scope="col">Item name</th>' + entryState.variables.map((variable, index) => `
    <th scope="col" class="variable-heading">
      <div class="variable-heading-row"><span>Variable ${index + 1}</span><button class="remove-control" type="button" data-remove-variable="${variable.id}" aria-label="Remove variable ${index + 1}" ${entryState.variables.length === 1 ? 'disabled' : ''}>×</button></div>
      <input class="variable-name" data-variable-name="${variable.id}" type="text" maxlength="60" aria-label="Variable ${index + 1} name" aria-describedby="variable-error-${variable.id}" placeholder="e.g. Math marks" value="${escapeHTML(variable.name)}" />
      <input class="variable-unit" data-variable-unit="${variable.id}" type="text" maxlength="20" aria-label="Optional unit for variable ${index + 1}" placeholder="Unit (optional)" value="${escapeHTML(variable.unit)}" />
      <span class="field-error" id="variable-error-${variable.id}" data-variable-error="${variable.id}"></span>
    </th>`).join('');
  body.innerHTML = entryState.items.map((item, index) => `<tr>
    <td class="item-cell"><div class="item-field"><input class="item-name" data-item-name="${item.id}" type="text" maxlength="60" aria-label="Item ${index + 1} name" aria-describedby="item-error-${item.id}" placeholder="e.g. Alice" value="${escapeHTML(item.name)}" /><button class="remove-control remove-item" type="button" data-remove-item="${item.id}" aria-label="Remove item ${index + 1}" ${entryState.items.length === 1 ? 'disabled' : ''}>×</button><span class="field-error" id="item-error-${item.id}" data-item-error="${item.id}"></span></div></td>
    ${entryState.variables.map((variable) => `<td><input class="metric-value" data-item-value="${item.id}" data-variable-id="${variable.id}" type="number" step="any" aria-label="${escapeHTML(item.name || `Item ${index + 1}`)}, ${escapeHTML(variable.name || 'unnamed variable')} value" aria-describedby="value-error-${item.id}-${variable.id}" placeholder="Enter a number" value="${escapeHTML(item.values[variable.id] ?? '')}" /><span class="field-error value-error" id="value-error-${item.id}-${variable.id}" data-value-error="${item.id}-${variable.id}"></span></td>`).join('')}
  </tr>`).join('');
}

function clearEntryErrors() {
  document.querySelectorAll('.manual-form [aria-invalid="true"]').forEach((field) => field.removeAttribute('aria-invalid'));
  document.querySelectorAll('.field-error').forEach((message) => { message.textContent = ''; });
  document.querySelector('#entry-form-error').textContent = '';
}

function validateEntryForm() {
  syncEntryState();
  clearEntryErrors();
  let valid = true;
  const title = document.querySelector('#comparison-name');
  if (!title.value.trim()) {
    title.setAttribute('aria-invalid', 'true');
    document.querySelector('#comparison-name-error').textContent = 'Enter a name for this comparison.';
    valid = false;
  } else {
    document.querySelector('#comparison-name-error').textContent = '';
  }

  const names = entryState.variables.map((variable) => variable.name.trim().toLocaleLowerCase());
  entryState.variables.forEach((variable, index) => {
    const input = document.querySelector(`[data-variable-name="${variable.id}"]`);
    const error = document.querySelector(`[data-variable-error="${variable.id}"]`);
    if (!variable.name.trim()) {
      input.setAttribute('aria-invalid', 'true');
      error.textContent = 'Name required.';
      valid = false;
    } else if (names.indexOf(names[index]) !== index) {
      input.setAttribute('aria-invalid', 'true');
      error.textContent = 'Use a different variable name.';
      valid = false;
    }
  });

  entryState.items.forEach((item) => {
    const input = document.querySelector(`[data-item-name="${item.id}"]`);
    const error = document.querySelector(`[data-item-error="${item.id}"]`);
    if (!item.name.trim()) {
      input.setAttribute('aria-invalid', 'true');
      error.textContent = 'Name required.';
      valid = false;
    }
  });

  entryState.items.forEach((item) => entryState.variables.forEach((variable) => {
    const input = document.querySelector(`[data-item-value="${item.id}"][data-variable-id="${variable.id}"]`);
    const rawValue = item.values[variable.id];
    input.removeAttribute('title');
    if (String(rawValue).trim() === '' || !Number.isFinite(Number(rawValue))) {
      input.setAttribute('aria-invalid', 'true');
      input.title = 'Enter a valid number.';
      document.querySelector(`[data-value-error="${item.id}-${variable.id}"]`).textContent = 'Enter a number.';
      valid = false;
    }
  }));

  if (!valid) {
    document.querySelector('#entry-form-error').textContent = 'Please fix the highlighted fields. Names and numeric values are required.';
    document.querySelector('.manual-form [aria-invalid="true"]')?.focus();
  }
  return valid;
}

function formatValue(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function renderResults(user) {
  const resultId = localStorage.getItem(selectedComparisonKey(user));
  const comparison = loadComparisons(user).find((item) => item.id === resultId);
  const title = document.querySelector('#results-title');
  const subtitle = document.querySelector('#results-subtitle');
  const count = document.querySelector('#results-count');
  const head = document.querySelector('#results-table-head');
  const body = document.querySelector('#results-table-body');
  const chart = document.querySelector('#results-chart');
  const variableSelect = document.querySelector('#chart-variable-select');
  const editButton = document.querySelector('#edit-result-button');
  if (!comparison) {
    title.textContent = 'No comparison selected';
    subtitle.textContent = 'Create a comparison to see its results here.';
    count.textContent = '';
    head.innerHTML = '';
    body.innerHTML = '';
    chart.setAttribute('aria-label', 'No comparison selected');
    chart.innerHTML = '<p class="chart-empty">There is no saved comparison to chart yet.</p>';
    variableSelect.innerHTML = '';
    editButton.disabled = true;
    return;
  }
  editButton.disabled = false;
  title.textContent = comparison.title;
  subtitle.textContent = 'Your values, shown side by side.';
  count.textContent = `${comparison.items.length} items · ${comparison.variables.length} variables`;
  if (!comparison.variables.some((variable) => variable.name === activeChartVariableName)) {
    activeChartVariableName = comparison.variables[0]?.name || '';
  }
  variableSelect.innerHTML = comparison.variables.map((variable) => `<option value="${escapeHTML(variable.name)}" ${variable.name === activeChartVariableName ? 'selected' : ''}>${escapeHTML(variable.name)}${variable.unit ? ` (${escapeHTML(variable.unit)})` : ''}</option>`).join('');
  variableSelect.disabled = comparison.variables.length < 2;
  head.innerHTML = '<th scope="col">Item</th>' + comparison.variables.map((variable) => `<th scope="col">${escapeHTML(variable.name)}${variable.unit ? `<span class="unit-label">${escapeHTML(variable.unit)}</span>` : ''}</th>`).join('');
  body.innerHTML = comparison.items.map((item) => `<tr><th scope="row">${escapeHTML(item.name)}</th>${comparison.variables.map((variable) => `<td>${formatValue(item.values[variable.name])}${variable.unit ? `<span class="unit-label">${escapeHTML(variable.unit)}</span>` : ''}</td>`).join('')}</tr>`).join('');
  renderComparisonChart(comparison, activeChartVariableName);
}

function renderComparisonChart(comparison, variableName) {
  const container = document.querySelector('#results-chart');
  const variable = comparison.variables.find((item) => item.name === variableName);
  if (!variable || !comparison.items.length) {
    container.setAttribute('aria-label', 'No values to chart');
    container.innerHTML = '<p class="chart-empty">Add items and values to see the chart.</p>';
    return;
  }
  const values = comparison.items.map((item) => Number(item.values[variable.name]));
  const minimum = Math.min(0, ...values);
  let maximum = Math.max(0, ...values);
  if (minimum === maximum) maximum = minimum + 1;
  const range = maximum - minimum;
  const zeroPosition = ((0 - minimum) / range) * 100;
  const unit = variable.unit ? ` ${variable.unit}` : '';
  const ariaSummary = comparison.items.map((item) => `${item.name}: ${formatValue(item.values[variable.name])}${unit}`).join('; ');
  container.setAttribute('aria-label', `${variable.name}${unit ? `, ${variable.unit}` : ''}. ${ariaSummary}`);
  container.innerHTML = `<div class="chart-axis-labels"><span>${formatValue(minimum)}${unit}</span>${minimum < 0 && maximum > 0 ? `<span class="chart-zero-label" style="left:${zeroPosition}%">0</span>` : ""}<span>${formatValue(maximum)}${unit}</span></div><div class="chart-rows">${comparison.items.map((item) => {
    const value = Number(item.values[variable.name]);
    const start = value < 0 ? ((value - minimum) / range) * 100 : zeroPosition;
    const width = Math.abs(value / range) * 100;
    return `<div class="chart-row"><span class="chart-item-name" title="${escapeHTML(item.name)}">${escapeHTML(item.name)}</span><div class="chart-track"><span class="chart-zero-line" style="left:${zeroPosition}%"></span><span class="chart-bar ${value < 0 ? 'negative' : ''}" style="left:${start}%;width:${width}%" title="${escapeHTML(item.name)}: ${formatValue(value)}${escapeHTML(unit)}"></span></div><span class="chart-value">${formatValue(value)}${unit ? `<small>${escapeHTML(variable.unit)}</small>` : ''}</span></div>`;
  }).join('')}</div>`;
}
function saveManualComparison(event) {
  event.preventDefault();
  if (!validateEntryForm()) return;
  const user = getDemoUser();
  if (!user) return;
  syncEntryState();
  const comparisons = window.comparisonStore.list(user);
  const editingIndex = editingComparisonId ? comparisons.findIndex((item) => item.id === editingComparisonId) : -1;
  const existing = editingIndex >= 0 ? comparisons[editingIndex] : null;
  const comparison = {
    id: existing?.id || globalThis.crypto?.randomUUID?.() || `comparison-${Date.now()}`,
    title: document.querySelector('#comparison-name').value.trim(),
    category: existing?.category || 'Custom',
    groupName: existing?.groupName || 'items',
    variables: entryState.variables.map((variable) => ({ name: variable.name.trim(), unit: variable.unit.trim() })),
    items: entryState.items.map((item) => ({
      name: item.name.trim(),
      values: Object.fromEntries(entryState.variables.map((variable) => [variable.name.trim(), Number(item.values[variable.id])])),
    })),
    updatedAt: new Date().toISOString(),
    source: existing?.source || 'Manual entry',
  };
  if (editingIndex >= 0) comparisons[editingIndex] = comparison;
  else comparisons.unshift(comparison);
  window.comparisonStore.save(user, comparisons);
  localStorage.setItem(selectedComparisonKey(user), comparison.id);
  activeChartVariableName = comparison.variables[0]?.name || '';
  editingComparisonId = null;
  document.querySelector('#manual-comparison-form').reset();
  document.querySelector('#comparison-name-error').textContent = '';
  document.querySelector('#entry-form-error').textContent = '';
  document.querySelector('#new-title').textContent = 'Create a comparison';
  document.querySelector('#save-manual-button').textContent = 'Save and view results →';
  document.querySelector('#cancel-manual-edit').href = '#dashboard';
  document.querySelector('#cancel-manual-edit').textContent = 'Cancel';
  entryState = {
    variables: [{ id: `variable-${nextEntryId++}`, name: '', unit: '' }, { id: `variable-${nextEntryId++}`, name: '', unit: '' }],
    items: [{ id: `item-${nextEntryId++}`, name: '', values: {} }, { id: `item-${nextEntryId++}`, name: '', values: {} }],
  };
  entryState.items.forEach((item) => entryState.variables.forEach((variable) => { item.values[variable.id] = ''; }));
  renderEntryTable();
  window.location.hash = '#comparison-results';
  showCurrentView();
}

function editComparison(comparisonId) {
  const user = getDemoUser();
  if (!user) return;
  const comparison = window.comparisonStore.list(user).find((item) => item.id === comparisonId);
  if (!comparison) return;
  editingComparisonId = comparison.id;
  entryState = {
    variables: comparison.variables.map((variable, index) => ({ id: `edit-variable-${index + 1}`, name: variable.name, unit: variable.unit || '' })),
    items: comparison.items.map((item, index) => ({
      id: `edit-item-${index + 1}`,
      name: item.name,
      values: Object.fromEntries(comparison.variables.map((variable, variableIndex) => [`edit-variable-${variableIndex + 1}`, String(item.values[variable.name] ?? '')])),
    })),
  };
  document.querySelector('#comparison-name').value = comparison.title;
  document.querySelector('#new-title').textContent = 'Edit comparison';
  document.querySelector('#save-manual-button').textContent = 'Save changes and view results →';
  document.querySelector('#cancel-manual-edit').href = '#comparison-results';
  document.querySelector('#cancel-manual-edit').textContent = 'Cancel editing';
  setEntryMode('manual');
  renderEntryTable();
  window.location.hash = '#new-comparison';
  showCurrentView();
}

function startFreshComparison() {
  if (!editingComparisonId) return;
  editingComparisonId = null;
  document.querySelector('#manual-comparison-form').reset();
  document.querySelector('#new-title').textContent = 'Create a comparison';
  document.querySelector('#save-manual-button').textContent = 'Save and view results →';
  document.querySelector('#cancel-manual-edit').href = '#dashboard';
  document.querySelector('#cancel-manual-edit').textContent = 'Cancel';
  entryState = {
    variables: [{ id: `variable-${nextEntryId++}`, name: '', unit: '' }, { id: `variable-${nextEntryId++}`, name: '', unit: '' }],
    items: [{ id: `item-${nextEntryId++}`, name: '', values: {} }, { id: `item-${nextEntryId++}`, name: '', values: {} }],
  };
  entryState.items.forEach((item) => entryState.variables.forEach((variable) => { item.values[variable.id] = ''; }));
  renderEntryTable();
  setEntryMode('manual');
}
document.querySelector('#manual-comparison-form').addEventListener('submit', saveManualComparison);
document.querySelector('#manual-comparison-form').addEventListener('input', (event) => {
  if (event.target.matches('[data-variable-name], [data-variable-unit], [data-item-name], [data-item-value]')) syncEntryState();
});
document.querySelector('#add-item').addEventListener('click', () => {
  syncEntryState();
  const id = `item-${nextEntryId++}`;
  entryState.items.push({ id, name: '', values: Object.fromEntries(entryState.variables.map((variable) => [variable.id, ''])) });
  renderEntryTable();
  document.querySelector(`[data-item-name="${id}"]`)?.focus();
});
document.querySelector('#add-variable').addEventListener('click', () => {
  syncEntryState();
  const id = `variable-${nextEntryId++}`;
  entryState.variables.push({ id, name: '', unit: '' });
  entryState.items.forEach((item) => { item.values[id] = ''; });
  renderEntryTable();
  document.querySelector(`[data-variable-name="${id}"]`)?.focus();
});
document.querySelector('#entry-table-head').addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove-variable]');
  if (!button || entryState.variables.length <= 1) return;
  syncEntryState();
  const id = button.dataset.removeVariable;
  const removedIndex = entryState.variables.findIndex((variable) => variable.id === id);
  entryState.variables = entryState.variables.filter((variable) => variable.id !== id);
  entryState.items.forEach((item) => { delete item.values[id]; });
  renderEntryTable();
  const nextVariable = entryState.variables[Math.min(removedIndex, entryState.variables.length - 1)];
  document.querySelector(`[data-variable-name="${nextVariable.id}"]`)?.focus();
});
document.querySelector('#entry-table-body').addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove-item]');
  if (!button || entryState.items.length <= 1) return;
  syncEntryState();
  const removedIndex = entryState.items.findIndex((item) => item.id === button.dataset.removeItem);
  entryState.items = entryState.items.filter((item) => item.id !== button.dataset.removeItem);
  renderEntryTable();
  const nextItem = entryState.items[Math.min(removedIndex, entryState.items.length - 1)];
  document.querySelector(`[data-item-name="${nextItem.id}"]`)?.focus();
});

renderEntryTable();
showCurrentView();






const manualModeTab = document.querySelector('#manual-mode-tab');
const excelModeTab = document.querySelector('#excel-mode-tab');
const manualPanel = document.querySelector('#manual-panel');
const excelPanel = document.querySelector('#excel-panel');
const excelFileInput = document.querySelector('#xlsx-file');
const excelFileStatus = document.querySelector('#excel-file-status');
const excelReview = document.querySelector('#excel-review');
const sheetPicker = document.querySelector('#sheet-picker');
const sheetPickerWrap = document.querySelector('#sheet-picker-wrap');
let excelWorkbook = null;
let excelFileName = '';
let excelState = null;
let nextImportRowId = 1;
let excelReadRequestId = 0;

function setEntryMode(mode) {
  const isManual = mode === 'manual';
  manualPanel.hidden = !isManual;
  excelPanel.hidden = isManual;
  manualModeTab.classList.toggle('active', isManual);
  excelModeTab.classList.toggle('active', !isManual);
  manualModeTab.setAttribute('aria-selected', String(isManual));
  excelModeTab.setAttribute('aria-selected', String(!isManual));
}

function importCellText(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function importValueIsNumeric(value) {
  if (typeof value === 'number') return Number.isFinite(value);
  const text = String(value ?? '').trim();
  return text !== '' && Number.isFinite(Number(text));
}

function startExcelImport(file) {
  const requestId = ++excelReadRequestId;
  excelWorkbook = null;
  excelState = null;
  excelFileName = '';
  excelReview.hidden = true;
  sheetPickerWrap.hidden = true;
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    excelFileStatus.textContent = 'Please choose an .xlsx workbook.';
    excelFileStatus.className = 'excel-status error-text';
    excelFileInput.value = '';
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    excelFileStatus.textContent = 'This file is larger than 10 MB. Choose a smaller workbook.';
    excelFileStatus.className = 'excel-status error-text';
    excelFileInput.value = '';
    return;
  }
  if (!window.XLSX) {
    excelFileStatus.textContent = 'The Excel reader did not load. Check that vendor/xlsx.full.min.js is present, then reopen the page.';
    excelFileStatus.className = 'excel-status error-text';
    return;
  }

  excelFileName = file.name;
  excelFileStatus.textContent = 'Reading this workbook in your browser…';
  excelFileStatus.className = 'excel-status';
  file.arrayBuffer().then((buffer) => {
    if (requestId !== excelReadRequestId) return;
    excelWorkbook = window.XLSX.read(buffer, { type: 'array' });
    if (!excelWorkbook.SheetNames.length) throw new Error('The workbook has no worksheets.');
    sheetPicker.innerHTML = excelWorkbook.SheetNames.map((name) => `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`).join('');
    sheetPickerWrap.hidden = excelWorkbook.SheetNames.length < 2;
    document.querySelector('#excel-file-name').textContent = `${excelFileName} · ${excelWorkbook.SheetNames.length} worksheet${excelWorkbook.SheetNames.length === 1 ? '' : 's'}`;
    if (!loadExcelWorksheet(excelWorkbook.SheetNames[0])) return;
    excelReview.hidden = false;
    excelFileStatus.textContent = 'Workbook read locally. Review the worksheet and values below.';
    excelFileStatus.className = 'excel-status success-text';
  }).catch((error) => {
    if (requestId !== excelReadRequestId) return;
    excelWorkbook = null;
    excelState = null;
    excelFileStatus.textContent = error.message === 'The workbook has no worksheets.' ? error.message : 'Could not read this workbook. Check that it is a valid .xlsx file.';
    excelFileStatus.className = 'excel-status error-text';
    excelReview.hidden = true;
  });
}

function loadExcelWorksheet(sheetName) {
  const worksheet = excelWorkbook?.Sheets[sheetName];
  if (!worksheet) return;
  const rows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: '', blankrows: false });
  const headerRow = rows[0] || [];
  const headers = headerRow.map((value, index) => importCellText(value) || `Column ${index + 1}`);
  if (!headers.length) {
    excelFileStatus.textContent = 'This worksheet is empty. Choose another worksheet or workbook.';
    excelFileStatus.className = 'excel-status error-text';
    excelReview.hidden = true;
    return false;
  }
  const dataRows = rows.slice(1).filter((row) => row.some((value) => importCellText(value) !== ''));
  const importRows = dataRows.map((row) => ({
    id: `import-row-${nextImportRowId++}`,
    cells: headers.map((_, index) => importCellText(row[index])),
  }));
  const mappings = headers.map((name, index) => {
    const values = importRows.map((row) => row.cells[index]).filter((value) => value !== '');
    return {
      index,
      name,
      variableName: name,
      unit: '',
      include: index !== 0 && values.some(importValueIsNumeric),
    };
  });
  excelState = { headers, rows: importRows, itemColumn: 0, mappings };
  const suggestedName = excelFileName.replace(/\.xlsx$/i, '').replace(/[_-]+/g, ' ').trim();
  document.querySelector('#excel-comparison-name').value = suggestedName;
  renderExcelReview();
  return true;
}

function renderColumnMappings() {
  const itemSelect = document.querySelector('#item-column-select');
  itemSelect.innerHTML = excelState.headers.map((name, index) => `<option value="${index}" ${index === excelState.itemColumn ? 'selected' : ''}>${escapeHTML(name)}</option>`).join('');
  const mappings = excelState.mappings.filter((mapping) => mapping.index !== excelState.itemColumn);
  const container = document.querySelector('#column-mappings');
  if (!mappings.length) {
    container.innerHTML = '<p class="mapping-empty">Choose a different item-name column to use other columns as variables.</p>';
    return;
  }
  container.innerHTML = mappings.map((mapping) => {
    const sampleValues = excelState.rows.slice(0, 3).map((row) => row.cells[mapping.index]).filter(Boolean).join(', ');
    return `<article class="column-map-card ${mapping.include ? 'is-included' : ''}">
      <label class="mapping-checkbox"><input type="checkbox" data-map-include="${mapping.index}" ${mapping.include ? 'checked' : ''} /><span>Use column</span><strong>${escapeHTML(mapping.name)}</strong></label>
      <div class="mapping-fields"><label><span class="visually-hidden">Variable name for ${escapeHTML(mapping.name)}</span><input type="text" data-map-name="${mapping.index}" aria-label="Variable name for ${escapeHTML(mapping.name)}" aria-describedby="mapping-error-${mapping.index}" value="${escapeHTML(mapping.variableName)}" ${mapping.include ? '' : 'disabled'} /></label><label><span class="visually-hidden">Unit for ${escapeHTML(mapping.name)}</span><input type="text" data-map-unit="${mapping.index}" aria-label="Optional unit for ${escapeHTML(mapping.name)}" placeholder="Unit (optional)" value="${escapeHTML(mapping.unit)}" ${mapping.include ? '' : 'disabled'} /></label><span class="field-error mapping-error" id="mapping-error-${mapping.index}" data-mapping-error="${mapping.index}"></span></div>
      <p class="mapping-sample">Sample: ${escapeHTML(sampleValues || 'No values')}</p>
    </article>`;
  }).join('');
}

function renderImportPreview() {
  if (!excelState) return;
  const selectedMappings = excelState.mappings.filter((mapping) => mapping.index !== excelState.itemColumn && mapping.include);
  const head = document.querySelector('#import-preview-head');
  const body = document.querySelector('#import-preview-body');
  head.innerHTML = `<th scope="col">${escapeHTML(excelState.headers[excelState.itemColumn])}</th>${selectedMappings.map((mapping) => `<th scope="col">${escapeHTML(mapping.variableName || mapping.name)}${mapping.unit ? `<span class="unit-label">${escapeHTML(mapping.unit)}</span>` : ''}</th>`).join('')}<th scope="col"><span class="visually-hidden">Row actions</span></th>`;
  document.querySelector('#preview-summary').textContent = `${excelState.rows.length} rows · ${selectedMappings.length} selected variables`;
  if (!excelState.rows.length) {
    body.innerHTML = `<tr><td class="empty-history" colspan="${selectedMappings.length + 2}">This worksheet has no data rows under its header.</td></tr>`;
  } else {
    body.innerHTML = excelState.rows.map((row, rowIndex) => `<tr data-preview-row="${row.id}">
      <td class="preview-item-cell"><input type="text" data-import-item="${row.id}" aria-label="Item name, row ${rowIndex + 1}" aria-describedby="import-row-error-${row.id}" placeholder="Enter item name" value="${escapeHTML(row.cells[excelState.itemColumn])}" /><span class="import-row-error" id="import-row-error-${row.id}" data-row-error="${row.id}"></span></td>
      ${selectedMappings.map((mapping) => `<td><input type="text" inputmode="decimal" data-import-row="${row.id}" data-import-column="${mapping.index}" aria-label="${escapeHTML(row.cells[excelState.itemColumn] || `Row ${rowIndex + 1}`)}, ${escapeHTML(mapping.variableName || mapping.name)}" aria-describedby="import-row-error-${row.id}" value="${escapeHTML(row.cells[mapping.index])}" /></td>`).join('')}
      <td><button class="remove-import-row" type="button" data-remove-import-row="${row.id}" aria-label="Remove row ${rowIndex + 1}">Remove</button></td>
    </tr>`).join('');
  }
  updateExcelValidation();
}

function renderExcelReview() {
  renderColumnMappings();
  renderImportPreview();
  excelReview.hidden = false;
}

function updateExcelValidation() {
  if (!excelState) return;
  const issues = [];
  const title = document.querySelector('#excel-comparison-name').value.trim();
  const titleError = document.querySelector('#excel-title-error');
  titleError.textContent = title ? '' : 'Enter a name for this comparison.';
  document.querySelector('#excel-comparison-name').setAttribute('aria-invalid', String(!title));
  if (!title) issues.push('Add a comparison name.');

  const selectedMappings = excelState.mappings.filter((mapping) => mapping.index !== excelState.itemColumn && mapping.include);
  if (!selectedMappings.length) issues.push('Choose at least one numeric variable.');
  const variableNames = selectedMappings.map((mapping) => mapping.variableName.trim().toLocaleLowerCase());
  selectedMappings.forEach((mapping, index) => {
    const nameInput = document.querySelector(`[data-map-name="${mapping.index}"]`);
    const missingName = !mapping.variableName.trim();
    const duplicateName = !missingName && variableNames.indexOf(variableNames[index]) !== index;
    nameInput.setAttribute('aria-invalid', String(missingName || duplicateName));
    const nameError = document.querySelector(`[data-mapping-error="${mapping.index}"]`);
    nameError.textContent = missingName ? 'Enter a variable name.' : duplicateName ? 'Use a different variable name.' : '';
    if (missingName) issues.push(`Name the variable from column “${mapping.name}”.`);
    else if (duplicateName) issues.push(`Give each selected variable a different name.`);
  });
  if (!excelState.rows.length) issues.push('Add at least one data row.');

  let invalidCells = 0;
  excelState.rows.forEach((row) => {
    const itemInput = document.querySelector(`[data-import-item="${row.id}"]`);
    const rowElement = document.querySelector(`[data-preview-row="${row.id}"]`);
    const rowMessages = [];
    const itemName = row.cells[excelState.itemColumn];
    const missingItem = !String(itemName ?? '').trim();
    itemInput.setAttribute('aria-invalid', String(missingItem));
    if (missingItem) { invalidCells += 1; rowMessages.push('Add an item name.'); }

    let badValues = 0;
    selectedMappings.forEach((mapping) => {
      const input = document.querySelector(`[data-import-row="${row.id}"][data-import-column="${mapping.index}"]`);
      const value = row.cells[mapping.index];
      const invalid = !importValueIsNumeric(value);
      input.setAttribute('aria-invalid', String(invalid));
      if (invalid) badValues += 1;
    });
    if (badValues) { invalidCells += badValues; rowMessages.push(`${badValues} value${badValues === 1 ? '' : 's'} need a number.`); }
    document.querySelector(`[data-row-error="${row.id}"]`).textContent = rowMessages.join(' ');
    rowElement.classList.toggle('has-import-error', rowMessages.length > 0);
  });

  if (invalidCells) issues.push(`${invalidCells} missing or non-numeric cell${invalidCells === 1 ? '' : 's'} need attention.`);
  const issueCount = issues.length + Math.max(0, invalidCells - (invalidCells ? 1 : 0));
  document.querySelector('#import-issue-count').textContent = issueCount ? `${issueCount} issue${issueCount === 1 ? '' : 's'}` : 'Ready to import';
  document.querySelector('#import-issue-count').classList.toggle('has-issues', issueCount > 0);
  document.querySelector('#import-issues').classList.toggle('has-issues', issueCount > 0);
  document.querySelector('#import-issues').textContent = issues.length ? issues.join(' ') : 'All visible rows have item names and numeric values.';
  document.querySelector('#confirm-excel-import').disabled = issueCount > 0;
}

function saveExcelComparison() {
  if (!excelState) return;
  updateExcelValidation();
  if (document.querySelector('#confirm-excel-import').disabled) return;
  const user = getDemoUser();
  if (!user) return;
  const selectedMappings = excelState.mappings.filter((mapping) => mapping.index !== excelState.itemColumn && mapping.include);
  const comparison = {
    id: globalThis.crypto?.randomUUID?.() || `comparison-${Date.now()}`,
    title: document.querySelector('#excel-comparison-name').value.trim(),
    category: 'Custom',
    groupName: 'items',
    variables: selectedMappings.map((mapping) => ({ name: mapping.variableName.trim(), unit: mapping.unit.trim() })),
    items: excelState.rows.map((row) => ({
      name: String(row.cells[excelState.itemColumn]).trim(),
      values: Object.fromEntries(selectedMappings.map((mapping) => [mapping.variableName.trim(), Number(row.cells[mapping.index])])),
    })),
    updatedAt: new Date().toISOString(),
    source: 'Excel import',
  };
  const comparisons = window.comparisonStore.list(user);
  comparisons.unshift(comparison);
  window.comparisonStore.save(user, comparisons);
  localStorage.setItem(selectedComparisonKey(user), comparison.id);
  resetExcelImport();
  window.location.hash = '#comparison-results';
  showCurrentView();
}

function resetExcelImport() {
  excelReadRequestId += 1;
  excelWorkbook = null;
  excelState = null;
  excelFileName = '';
  excelFileInput.value = '';
  excelReview.hidden = true;
  sheetPickerWrap.hidden = true;
  excelFileStatus.textContent = '';
  excelFileStatus.className = 'excel-status';
}

manualModeTab.addEventListener('click', () => setEntryMode('manual'));
excelModeTab.addEventListener('click', () => setEntryMode('excel'));
document.querySelector('.entry-mode-tabs').addEventListener('keydown', (event) => {
  const tabs = [manualModeTab, excelModeTab];
  const currentIndex = tabs.indexOf(document.activeElement);
  if (currentIndex < 0) return;
  let nextIndex = currentIndex;
  if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
  else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  else if (event.key === 'Home') nextIndex = 0;
  else if (event.key === 'End') nextIndex = tabs.length - 1;
  else return;
  event.preventDefault();
  tabs[nextIndex].focus();
  tabs[nextIndex].click();
});
excelFileInput.addEventListener('change', (event) => startExcelImport(event.target.files[0]));
sheetPicker.addEventListener('change', () => { if (excelWorkbook) loadExcelWorksheet(sheetPicker.value); });
document.querySelector('#choose-another-file').addEventListener('click', () => { excelFileInput.value = ''; excelFileInput.click(); });
document.querySelector('#cancel-excel-import').addEventListener('click', resetExcelImport);
document.querySelector('#confirm-excel-import').addEventListener('click', saveExcelComparison);
document.querySelector('#excel-comparison-name').addEventListener('input', updateExcelValidation);
document.querySelector('#item-column-select').addEventListener('change', (event) => {
  if (!excelState) return;
  excelState.itemColumn = Number(event.target.value);
  renderColumnMappings();
  renderImportPreview();
});
document.querySelector('#column-mappings').addEventListener('change', (event) => {
  if (!excelState) return;
  const index = Number(event.target.dataset.mapInclude);
  if (event.target.matches('[data-map-include]')) {
    excelState.mappings[index].include = event.target.checked;
    renderColumnMappings();
    renderImportPreview();
  }
});
document.querySelector('#column-mappings').addEventListener('input', (event) => {
  if (!excelState) return;
  const index = Number(event.target.dataset.mapName ?? event.target.dataset.mapUnit);
  if (event.target.matches('[data-map-name]')) excelState.mappings[index].variableName = event.target.value;
  if (event.target.matches('[data-map-unit]')) excelState.mappings[index].unit = event.target.value;
  renderImportPreview();
});
document.querySelector('#import-preview-body').addEventListener('input', (event) => {
  if (!excelState) return;
  if (event.target.matches('[data-import-item]')) {
    const row = excelState.rows.find((item) => item.id === event.target.dataset.importItem);
    if (row) row.cells[excelState.itemColumn] = event.target.value;
  }
  if (event.target.matches('[data-import-row]')) {
    const row = excelState.rows.find((item) => item.id === event.target.dataset.importRow);
    if (row) row.cells[Number(event.target.dataset.importColumn)] = event.target.value;
  }
  updateExcelValidation();
});
document.querySelector('#import-preview-body').addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove-import-row]');
  if (!button || !excelState) return;
  excelState.rows = excelState.rows.filter((row) => row.id !== button.dataset.removeImportRow);
  renderImportPreview();
});









document.querySelector('#chart-variable-select').addEventListener('change', (event) => {
  activeChartVariableName = event.target.value;
  renderResults(getDemoUser());
});

document.querySelector('#edit-result-button').addEventListener('click', () => {
  const user = getDemoUser();
  const comparisonId = user && localStorage.getItem(selectedComparisonKey(user));
  if (comparisonId) editComparison(comparisonId);
});

document.querySelector('#history-body').addEventListener('click', handleHistoryAction);

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href="#new-comparison"]');
  if (link) startFreshComparison();
});