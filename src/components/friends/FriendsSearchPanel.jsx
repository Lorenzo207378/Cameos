import { useTranslation } from '../../contexts/LanguageContext.jsx';

/**
 * FriendsSearchPanel
 * Pannello laterale fisso dedicato alla ricerca degli utenti nella pagina Amici.
 * @returns {import('react').ReactElement}
 */
export default function FriendsSearchPanel() {
  const { t } = useTranslation();

  return (
    <aside className="friends-search-panel d-flex flex-column w-100 h-100">
      <div className="friends-search-header d-flex align-items-center gap-2 flex-shrink-0 pb-2 mb-2">
        <i className="bi bi-search text-success" aria-hidden="true" />
        <h2 className="friends-search-title mb-0">{t('social.searchUsersHeading')}</h2>
      </div>

      <div className="friends-search-scroll-list scrollbar-none pe-1">
        <div className="friends-search-placeholder-box d-flex flex-column align-items-center justify-content-center text-center p-4">
          <i className="bi bi-person-plus text-success d-block mb-2 fs-3" aria-hidden="true" />
          <p className="mb-0 friends-state-text text-white-50">{t('social.searchUsersPlaceholder')}</p>
        </div>
      </div>
    </aside>
  );
}
