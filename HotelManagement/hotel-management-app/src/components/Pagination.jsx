// Previous / next with a window of page numbers. Hidden when everything fits on one page.
export default function Pagination({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const numbers = [];
  for (let n = start; n <= Math.min(pages, start + 4); n += 1) numbers.push(n);

  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="muted">
        {total === 0 ? 'No results' : `Showing ${from} to ${to} of ${total}`}
      </span>
      {pages > 1 && (
        <div className="pagination__controls">
          <button className="btn btn--secondary btn--small" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            Previous
          </button>
          {numbers.map((n) => (
            <button
              key={n}
              className={`btn btn--small ${n === page ? 'btn--primary' : 'btn--secondary'}`}
              aria-current={n === page ? 'page' : undefined}
              onClick={() => onPage(n)}
            >
              {n}
            </button>
          ))}
          <button className="btn btn--secondary btn--small" disabled={page >= pages} onClick={() => onPage(page + 1)}>
            Next
          </button>
        </div>
      )}
    </nav>
  );
}
