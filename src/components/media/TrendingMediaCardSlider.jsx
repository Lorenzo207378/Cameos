import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import TrendingMediaCardLateral from './TrendingMediaCardLateral.jsx';
import TrendingMediaCardMain from './TrendingMediaCardMain.jsx';
import { moveTouchSwipe, startTouchSwipe } from '../../utils/domUtils.js';
import '../../css/common/carouselControls.css';
import '../../css/common/text.css';
import '../../css/media/trendingMediaCardSlider.css';

/**
 * Prepara i soli dati usati dalle card, delegando la localizzazione al modello.
 * @param {import('../../models/Movie.js').Movie|import('../../models/Series.js').Series} item
 * @param {'movie'|'tv'} type
 * @param {string} langKey
 * @param {Function} t
 * @param {Function} formatTranslation
 * @returns {Object|null}
 */
function extractMediaPresentation(item, type, langKey, t, formatTranslation) {
    if (!item) return null;

    const isMovie = type === 'movie';
    const overview = item.getOverview(langKey);
    const overviewSnippet = overview || t('slider.plotUpdating');

    let extraBadge;
    if (!isMovie && item.numberOfSeasons) {
        extraBadge = formatTranslation(t(item.numberOfSeasons === 1 ? 'slider.seasonsCountSingle' : 'slider.seasonsCount'), { count: item.numberOfSeasons });
    } else {
        const releaseDate = isMovie ? item.releaseDate : item.firstAirDate;
        extraBadge = releaseDate?.slice(0, 4) || '';
    }

    return {
        detailPath: `/Cameos/${isMovie ? 'movie' : 'series'}/${item.id}`,
        title: (isMovie ? item.getTitle(langKey) : item.getName(langKey)) || t('slider.unknownTitle'),
        backdropSrc: item.getBackdropUrl(langKey),
        rating: item.voteAverage.toFixed(1),
        extraBadge,
        overviewSnippet
    };
}

/**
 * TrendingMediaCardSlider
 * Slider / Carousel superiore per i top trend con rotazione automatica (7s) e supporto sliding touch.
 *
 * @param {Object} props
 * @param {Array<import('../../models/Movie.js').Movie|import('../../models/Series.js').Series>} props.items - Top 10 titoli
 * @param {'movie'|'tv'} [props.type='movie']
 * @param {string} [props.className='']
 */
export default function TrendingMediaCardSlider({ items = [], type = 'movie', className = '', loading = false, error = null }) {
    const { t, langKey, formatTranslation } = useTranslation();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [slideDirection, setSlideDirection] = useState('');
    const [isPaused, setIsPaused] = useState(false);

    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const touchDeltaX = useRef(0);
    const touchDeltaY = useRef(0);

    const total = Math.min(items.length, 10);

    const nextSlide = useCallback(() => {
        if (total === 0) return;
        setSlideDirection('next');
        setCurrentIndex((prev) => (prev + 1) % total);
    }, [total]);

    const prevSlide = useCallback(() => {
        if (total === 0) return;
        setSlideDirection('prev');
        setCurrentIndex((prev) => (prev - 1 + total) % total);
    }, [total]);

    const selectSlide = useCallback((index) => {
        if (index === currentIndex) return;
        setSlideDirection(index > currentIndex ? 'next' : 'prev');
        setCurrentIndex(index);
    }, [currentIndex]);

    const handlePrevClick = useCallback(() => {
        prevSlide();
    }, [prevSlide]);

    const handleNextClick = useCallback(() => {
        nextSlide();
    }, [nextSlide]);

    // Touch swipe support per scorrimento con gesture touch su smartphone
    const touchRefs = { touchStartX, touchStartY, touchDeltaX, touchDeltaY };
    const handleTouchStart = (event) => startTouchSwipe(event, touchRefs);
    const handleTouchMove = (event) => moveTouchSwipe(event, touchRefs);

    const handleTouchEnd = () => {
        const dx = touchDeltaX.current;
        const dy = touchDeltaY.current;
        // Soglia di swipe: 35px e movimento prevalentemente orizzontale
        if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy) * 1.1) {
            if (dx < 0) {
                nextSlide();
            } else {
                prevSlide();
            }
        }
        touchDeltaX.current = 0;
        touchDeltaY.current = 0;
    };

    useEffect(() => {
        if (total <= 1 || isPaused) return undefined;
        const interval = setInterval(nextSlide, 7000);
        return () => clearInterval(interval);
    }, [total, isPaused, nextSlide]);

    if (total === 0) {
        if (!loading && !error) return null;
        return (
            <section className={`trending-carousel-wrapper ${className}`} aria-busy={loading} data-catalog-loading={loading && !error}>
                <div className="trending-card-active catalog-placeholder mx-auto d-flex align-items-center justify-content-center">
                    <span role={error ? 'alert' : 'status'} className="text-white">
                        {t(error ? 'common.error' : 'common.loading')}
                    </span>
                </div>
                <div className="trending-carousel-controls" aria-hidden="true" />
            </section>
        );
    }

    const prevIndex = (currentIndex - 1 + total) % total;
    const nextIndex = (currentIndex + 1) % total;

    const prevMedia = extractMediaPresentation(items[prevIndex], type, langKey, t, formatTranslation);
    const currentMedia = extractMediaPresentation(items[currentIndex], type, langKey, t, formatTranslation);
    const nextMedia = extractMediaPresentation(items[nextIndex], type, langKey, t, formatTranslation);

    return (
        <section
            className={`trending-carousel-wrapper position-relative ${className}`.trim()}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            aria-label={t('slider.carouselAria')}
        >
            {/* CORPO DEL CAROUSEL (CARD CENTRALE ATTIVA + CARD PREVIEW LATERALI -1 E +1) */}
            <div className="trending-carousel-track">
                <TrendingMediaCardLateral
                    media={prevMedia}
                    rank={prevIndex + 1}
                    side="left"
                    animationClass={slideDirection === 'next' ? 'side-anim-left-next' : ''}
                    onSelect={prevSlide}
                    t={t}
                />

                {/* CARD CENTRALE ATTIVA: MASSIMA PROMINENZA (780px x 440px) CON CONTENUTO COMPLETO */}
                <TrendingMediaCardMain
                    key={currentIndex}
                    media={currentMedia}
                    rank={currentIndex + 1}
                    slideDirection={slideDirection}
                    onAnimationEnd={() => setSlideDirection('')}
                    t={t}
                />

                <TrendingMediaCardLateral
                    media={nextMedia}
                    rank={nextIndex + 1}
                    side="right"
                    animationClass={slideDirection === 'prev' ? 'side-anim-right-prev' : ''}
                    onSelect={nextSlide}
                    t={t}
                />
            </div>

            {/* PROGRESS BAR E PULSANTI DI NAVIGAZIONE POSIZIONATI AL DI SOTTO DEL CAROUSEL */}
            <div className="trending-carousel-controls mx-auto">
                {/* PULSANTE DI NAVIGAZIONE SULLA SINISTRA */}
                <div className="trending-navigation">
                    <button
                        type="button"
                        className="rounded-circle d-flex align-items-center justify-content-center carousel-nav-btn"
                        onClick={handlePrevClick}
                        aria-label={t('slider.prevSlide')}
                    >
                        <i className="bi bi-chevron-left text-white"></i>
                    </button>
                </div>

                {/* PROGRESS BAR CENTRATA ORIZZONTALMENTE RISPETTO AL CAROUSEL */}
                <div className="trending-dots">
                    {Array.from({ length: total }).map((_, idx) => (
                        <button
                            key={idx}
                            type="button"
                            className={`hero-dot ${idx === currentIndex ? 'active' : ''}`}
                            onClick={(e) => {
                                selectSlide(idx);
                                e.currentTarget.blur();
                            }}
                            aria-label={formatTranslation(t('slider.goToSlide'), { index: idx + 1 })}
                            aria-current={idx === currentIndex ? 'true' : undefined}
                        />
                    ))}
                </div>

                {/* PULSANTE DI NAVIGAZIONE SULLA DESTRA */}
                <div className="trending-navigation">
                    <button
                        type="button"
                        className="rounded-circle d-flex align-items-center justify-content-center carousel-nav-btn"
                        onClick={handleNextClick}
                        aria-label={t('slider.nextSlide')}
                    >
                        <i className="bi bi-chevron-right text-white"></i>
                    </button>
                </div>
            </div>
        </section>
    );
}
