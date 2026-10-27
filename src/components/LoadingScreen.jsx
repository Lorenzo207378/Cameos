import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import Logo from '../assets/app-icon.png';
import { useTranslation } from '../utils/translations.js';

/**
 * LoadingScreen
 * Global reusable full-screen or container loading veil with Cameos branding,
 * neon spinner, and optional back navigation button.
 *
 * @param {Object} props
 * @param {boolean} [props.showBackButton=true] - Whether to show the top-left circular back button
 * @param {Function} [props.onBack] - Custom back handler (defaults to history.back() or /Cameos/films)
 * @param {string} [props.message] - Custom loading text (defaults to t('common.loading'))
 * @param {string} [props.className=''] - Additional CSS classes
 */
export default function LoadingScreen({
  showBackButton = true,
  onBack,
  message,
  className = ''
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleBack = () => {
    if (typeof onBack === 'function') {
      onBack();
      return;
    }
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/Cameos/films');
    }
  };

  return (
    <div
      className={`cameos-loading-screen position-relative w-100 min-vh-100 d-flex flex-column ${className}`}
      style={{
        backgroundColor: '#1E1E24',
        color: '#FFFFFF',
        overflowX: 'hidden'
      }}
      role="status"
      aria-live="polite"
    >
      {/* Top action bar with back button */}
      {showBackButton && (
        <div className="px-3 px-md-4 px-xl-5 pt-3 pt-md-4">
          <button
            type="button"
            onClick={handleBack}
            className="btn btn-dark rounded-circle shadow-lg d-flex align-items-center justify-content-center border border-secondary border-opacity-50"
            style={{
              width: '44px',
              height: '44px',
              backdropFilter: 'blur(8px)',
              backgroundColor: 'rgba(30, 30, 36, 0.65)'
            }}
            aria-label={t('detail.goBack')}
            title={t('detail.goBack')}
          >
            <i className="bi bi-arrow-left text-white fs-5" />
          </button>
        </div>
      )}

      {/* Centered Cameos loader */}
      <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center px-3 pb-5">
        <div
          className="d-flex align-items-center justify-content-center mb-4"
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37)'
          }}
        >
          <img
            src={Logo}
            alt="Cameos"
            width="48"
            height="48"
            style={{
              filter: 'drop-shadow(0 0 12px rgba(25, 135, 84, 0.45))'
            }}
          />
        </div>

        <div
          className="spinner-border text-success mb-3"
          role="status"
          style={{ width: '2.5rem', height: '2.5rem', borderWidth: '0.25rem' }}
        >
          <span className="visually-hidden">{message || t('common.loading')}</span>
        </div>

        <span className="text-secondary fw-semibold fs-6">
          {message || t('common.loading')}
        </span>
      </div>
    </div>
  );
}

LoadingScreen.propTypes = {
  showBackButton: PropTypes.bool,
  onBack: PropTypes.func,
  message: PropTypes.string,
  className: PropTypes.string
};
