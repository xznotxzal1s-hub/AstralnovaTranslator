import { buttonClassName, ButtonLink } from "@/components/ui/button";

type PaginationItem = number | "gap-start" | "gap-end";

type PaginationControlsProps = {
  ariaLabel: string;
  currentPage: number;
  getHref: (page: number) => string;
  nextLabel: string;
  previousLabel: string;
  statusText: string;
  title: string;
  totalPages: number;
};

function getPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const normalizedPages = [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);

  return normalizedPages.flatMap((page, index) => {
    const previousPage = normalizedPages[index - 1];
    if (previousPage && page - previousPage > 1) {
      return [previousPage === 1 ? "gap-start" : "gap-end", page];
    }

    return [page];
  });
}

export function PaginationControls({
  ariaLabel,
  currentPage,
  getHref,
  nextLabel,
  previousLabel,
  statusText,
  title,
  totalPages,
}: PaginationControlsProps) {
  if (totalPages <= 1) {
    return null;
  }

  const paginationItems = getPaginationItems(currentPage, totalPages);

  return (
    <nav className="chapter-pagination" aria-label={ariaLabel}>
      <div className="chapter-pagination-copy">
        <p className="eyebrow">{title}</p>
        <p className="muted">{statusText}</p>
      </div>
      <div className="chapter-pagination-actions">
        {currentPage > 1 ? (
          <ButtonLink className="pagination-link" href={getHref(currentPage - 1)}>
            {previousLabel}
          </ButtonLink>
        ) : (
          <span className={buttonClassName("link", "pagination-link is-disabled")}>{previousLabel}</span>
        )}
        <div className="chapter-page-number-row">
          {paginationItems.map((item) =>
            typeof item === "number" ? (
              item === currentPage ? (
                <span
                  key={item}
                  aria-current="page"
                  className={buttonClassName("link", "pagination-link pagination-number is-current")}
                >
                  {item}
                </span>
              ) : (
                <ButtonLink key={item} className="pagination-link pagination-number" href={getHref(item)}>
                  {item}
                </ButtonLink>
              )
            ) : (
              <span key={item} className="pagination-gap" aria-hidden="true">
                ...
              </span>
            ),
          )}
        </div>
        {currentPage < totalPages ? (
          <ButtonLink className="pagination-link" href={getHref(currentPage + 1)}>
            {nextLabel}
          </ButtonLink>
        ) : (
          <span className={buttonClassName("link", "pagination-link is-disabled")}>{nextLabel}</span>
        )}
      </div>
    </nav>
  );
}
