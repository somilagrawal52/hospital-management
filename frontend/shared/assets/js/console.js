(() => {
  const body = document.body;
  const toggle = document.querySelector('[data-sidebar-toggle]');

  if (toggle) {
    toggle.addEventListener('click', () => {
      const open = body.classList.toggle('console-nav-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  document.addEventListener('click', (event) => {
    const confirmForm = event.target.closest('form[data-confirm]');
    if (confirmForm && !window.confirm(confirmForm.dataset.confirm)) event.preventDefault();
  });

  document.querySelectorAll('[data-enhanced-table]').forEach((table) => {
    const rows = Array.from(table.tBodies[0]?.rows || []);
    const pageSize = Number(table.dataset.pageSize || 8);
    const search = document.querySelector(`[data-table-search="#${table.id}"]`);
    const pager = document.querySelector(`[data-table-pagination="#${table.id}"]`);
    let currentPage = 1;
    let query = '';

    const visibleRows = () => rows.filter((row) => row.textContent.toLowerCase().includes(query));
    const render = () => {
      const matched = visibleRows();
      const pages = Math.max(1, Math.ceil(matched.length / pageSize));
      currentPage = Math.min(currentPage, pages);
      const start = (currentPage - 1) * pageSize;
      rows.forEach((row) => { row.hidden = !matched.slice(start, start + pageSize).includes(row); });
      if (!pager) return;
      pager.replaceChildren();
      if (pages === 1) return;
      for (let page = 1; page <= pages; page += 1) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'console-button console-button--quiet console-button--small';
        button.textContent = String(page);
        button.setAttribute('aria-current', page === currentPage ? 'page' : 'false');
        button.addEventListener('click', () => { currentPage = page; render(); });
        pager.append(button);
      }
    };

    search?.addEventListener('input', () => { query = search.value.trim().toLowerCase(); currentPage = 1; render(); });
    table.querySelectorAll('[data-sort-column]').forEach((button) => {
      let ascending = true;
      button.addEventListener('click', () => {
        const index = Number(button.dataset.sortColumn);
        rows.sort((left, right) => left.cells[index].textContent.localeCompare(right.cells[index].textContent, undefined, { numeric: true }) * (ascending ? 1 : -1));
        rows.forEach((row) => table.tBodies[0].append(row));
        ascending = !ascending;
        render();
      });
    });
    render();
  });
})();
