import { useState, useId } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useLocation, useMatch, useNavigate } from 'react-router-dom';
import { useDevice } from '../../contexts/DeviceContext.jsx';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { normalizeSearchRequest } from '../../utils/search.js';

/** @param {{initialQuery: string, initialFilter: string}} props */
function SearchInput({ initialQuery, initialFilter }) {
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState(initialFilter);
  const [filterOpen, setFilterOpen] = useState(false);
  const { isMobile } = useDevice();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const searchMatch = useMatch('/Cameos/search');
  const id = useId();
  /** @type {{value: string, label: string}[]} */
  const options = [
    { value: 'all', label: t('search.all') },
    { value: 'title', label: t('search.media') },
    { value: 'actor', label: t('search.actors') },
    { value: 'director', label: t('search.directors') },
    { value: 'genre', label: t('search.genres') }
  ];
  const selected = options.find((option) => option.value === filter);
  /** @type {import('react').ReactElement[]} */
  const menuItems = options.map((option) => (
    <button type="button" key={option.value} aria-pressed={filter === option.value} className={`dropdown-item${filter === option.value ? ' active' : ''}`}
      onClick={() => { setFilter(option.value); setFilterOpen(false); }}>{option.label}</button>
  ));

  const submit = (event) => {
    event.preventDefault();
    const request = normalizeSearchRequest(query, filter);
    if (!request.query) return;
    // Keep the originating page immediately before the current search in history.
    navigate(`/Cameos/search?${new URLSearchParams({ q: request.query, filter: request.filter })}`, {
      replace: Boolean(searchMatch)
    });
  };

  return (
    <form role="search" onSubmit={submit}
      className={`input-group navbar-search flex-nowrap ${isMobile ? 'navbar-search-mobile' : 'navbar-search-desktop'}`}>
      <button type="submit" className="navSearchBar-button px-2 px-md-3 d-flex align-items-center justify-content-center" aria-label={t('nav.searchAriaLabel')}>
        <i className="bi bi-search" aria-hidden="true" />
      </button>
      <input type="search" name="q" className="form-control input-navbar" value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={isMobile ? t('nav.searchPlaceholder') : t('nav.searchPlaceholderDesktop')}
        aria-label={t('nav.searchAriaLabel')} autoComplete="off" />
      <Dropdown align="end" show={filterOpen} onToggle={setFilterOpen} className="navbar-search-filter">
        <Dropdown.Toggle id={id} variant="dark" className="navbar-search-filter-toggle" aria-label={`${t('search.filterLabel')}: ${selected.label}`} title={selected.label}>
          {isMobile ? <i className="bi bi-funnel" aria-hidden="true" /> : <span>{selected.label}</span>}
        </Dropdown.Toggle>
        <Dropdown.Menu variant="dark">{menuItems}</Dropdown.Menu>
      </Dropdown>
    </form>
  );
}

export default function SearchBar() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const { query, filter } = normalizeSearchRequest(params.get('q') || '', params.get('filter') || 'all');
  return <SearchInput key={`${location.pathname}:${location.search}`} initialQuery={query} initialFilter={filter} />;
}
