import { formatTranslation } from '../../utils/translationUtils.js';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '../../utils/translations.js';
import TrendingMediaCardLateral from './TrendingMediaCardLateral.jsx';
import TrendingMediaCardMain from './TrendingMediaCardMain.jsx';
import '../../css/common/carouselControls.css';
import '../../css/common/text.css';
import '../../css/media/trendingMediaCardSlider.css';

const clearNavBtnState = (el) => {
    if (!el) return;
    delete el.dataset.hovered;
    delete el.dataset.active;
    el.blur();
};

const navBtnPointerHandlers = {
    onPointerEnter: (e) => {
        if (e.pointerType === 'mouse' && !e.currentTarget.disabled) {
            e.currentTarget.dataset.hovered = 'true';
        }
    },
    onPointerLeave: (e) => {
        clearNavBtnState(e.currentTarget);
    },
    onPointerDown: (e) => {
        if (!e.currentTarget.disabled) {
            e.currentTarget.dataset.active = 'true';
        }
    },
    onPointerUp: (e) => {
        delete e.currentTarget.dataset.active;
        if (e.pointerType !== 'mouse') {
            clearNavBtnState(e.currentTarget);
        }
    },
    onPointerCancel: (e) => {
        clearNavBtnState(e.currentTarget);
    },
    onBlur: (e) => {
        delete e.currentTarget.dataset.hovered;
        delete e.currentTarget.dataset.active;
    }
};

/**
 * Prepara i soli dati usati dalle card, delegando la localizzazione al modello.
 * @param {import('../../models/Movie.js').Movie|import('../../models/Series.js').Series} item
 * @param {'movie'|'tv'} type
 * @param {string} langKey
 * @param {Function} t
 * @returns {Object|null}
 */
function extractMediaPresentation(item, type, langKey, t) {
    if (!item) return null;

    const isMovie = type === 'movie';
    const overview = item.getOverview(langKey);
    const overviewSnippet = overview || t('slider.plotUpdating');

    let extraBadge;
    if (!isMovie && item.numberOfSeasons) {
        extraBadge = formatTranslation(t('slider.seasonsCount'), { count: item.numberOfSeasons });
    } else {
        const releaseDate = isMovie ? item.releaseDate : item.firstAirDate;
        extraBadge = releaseDate?.slice(0, 4) || '';
    }

    return {
        detailPath: `/Cameos/${isMovie ? 'movie' : 'series'}/${item.id}`,
        title: item.getTitle(langKey) || t('slider.unknownTitle'),
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
 * @param {Array<{ movie: Object, cameos: Array<Object> }>|Object} [props.cameos=[]] - Mappa o lista dei camei per ciascun media
 * @param {'movie'|'tv'} [props.type='movie']
 */
export default function TrendingMediaCardSlider({ items = [], type = 'movie' }) {
    const { t, langKey } = useTranslation();

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

    const handlePrevClick = useCallback((event) => {
        prevSlide();
        clearNavBtnState(event.currentTarget);
    }, [prevSlide]);

    const handleNextClick = useCallback((event) => {
        nextSlide();
        clearNavBtnState(event.currentTarget);
    }, [nextSlide]);

    // Touch swipe support per scorrimento con gesture touch su smartphone
    const handleTouchStart = (e) => {
        if (e.touches && e.touches.length === 1) {
            touchStartX.current = e.touches[0].clientX;
            touchStartY.current = e.touches[0].clientY;
            touchDeltaX.current = 0;
            touchDeltaY.current = 0;
        }
    };

    const handleTouchMove = (e) => {
        if (e.touches && e.touches.length === 1) {
            touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
            touchDeltaY.current = e.touches[0].clientY - touchStartY.current;
        }
    };

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

    if (total === 0) return null;

    const prevIndex = (currentIndex - 1 + total) % total;
    const nextIndex = (currentIndex + 1) % total;

    const prevMedia = extractMediaPresentation(items[prevIndex], type, langKey, t);
    const currentMedia = extractMediaPresentation(items[currentIndex], type, langKey, t);
    const nextMedia = extractMediaPresentation(items[nextIndex], type, langKey, t);

    return (
        <section
            className="trending-carousel-wrapper position-relative mb-3"
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
                        {...navBtnPointerHandlers}
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
                        {...navBtnPointerHandlers}
                        aria-label={t('slider.nextSlide')}
                    >
                        <i className="bi bi-chevron-right text-white"></i>
                    </button>
                </div>
            </div>
        </section>
    );
}
