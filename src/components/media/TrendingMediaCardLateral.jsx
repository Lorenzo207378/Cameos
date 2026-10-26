/**
 * Card preview laterale per un contenuto in tendenza.
 *
 * @param {Object} props
 * @param {Object} props.media - Dati di presentazione del contenuto
 * @param {number} props.rank - Posizione del contenuto nel carousel
 * @param {'left'|'right'} props.side - Lato della card nel carousel
 * @param {string} [props.animationClass=''] - Classe di animazione opzionale
 * @param {Function} props.onSelect - Callback per selezionare la card
 * @param {Function} props.t - Funzione di traduzione
 */
export default function TrendingMediaCardLateral({
  media,
  rank,
  side,
  animationClass = '',
  onSelect,
  t
}) {
  if (!media) return null;

  const isLeft = side === 'left';
  const actionIcon = isLeft ? 'bi-arrow-left-circle-fill' : 'bi-arrow-right-circle-fill';
  const sideClass = isLeft ? 'trending-card-left' : 'trending-card-right';
  const ariaLabel = isLeft
    ? t(
      'slider.prevTitleAria',
      { title: media.title }
    )
    : t(
      'slider.nextTitleAria',
      { title: media.title }
    );

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      className={`trending-card-side ${sideClass} d-none d-lg-block ${animationClass}`}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
    >
      <div
        className={`trending-side-backdrop ${media.backdropSrc ? 'has-backdrop' : ''}`}
        style={media.backdropSrc ? { '--card-backdrop-img': `url("${media.backdropSrc}")` } : undefined}
      />

      <div className="trending-side-content">
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <span className="badge rounded-pill bg-dark bg-opacity-75 text-white-50 border border-secondary border-opacity-25 trending-side-badge">
            TOP #{rank}
          </span>
          {media.rating > 0 && (
            <span className="badge rounded-pill bg-warning bg-opacity-75 text-dark trending-side-badge d-flex align-items-center gap-1">
              <i className="bi bi-star-fill"></i> {media.rating}
            </span>
          )}
          {media.extraBadge && (
            <span className="badge rounded-pill bg-dark bg-opacity-75 text-white-50 border border-secondary border-opacity-25 trending-side-badge">
              {media.extraBadge}
            </span>
          )}
        </div>

        <div>
          <h3 className="trending-side-title">{media.title}</h3>
          <p className="trending-side-snippet">{media.overviewSnippet}</p>
          <div className="trending-side-action">
            {isLeft && <i className={`bi ${actionIcon}`}></i>}
            {t('slider.clickToView')}
            {!isLeft && <i className={`bi ${actionIcon}`}></i>}
          </div>
        </div>
      </div>
    </div>
  );
}
