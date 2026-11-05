import PropTypes from 'prop-types';

import { useTranslation } from '../contexts/LanguageContext.jsx';
import '../css/components/loadingScreen.css';

const logoUrl = new URL('../assets/app-icon.png', import.meta.url).href;

/**
 * LoadingScreen
 * Global reusable full-screen or container loading veil with Cameos branding,
 * and neon spinner.
 *
 * @param {Object} props
 * @param {string} [props.message] - Custom loading text (defaults to t('common.loading'))
 * @param {string} [props.className=''] - Additional CSS classes
 */
export default function LoadingScreen({
  message,
  className = ''
}) {

  const { t } = useTranslation();

  return (
    <div
      className={`cameos-loading-screen position-relative w-100 min-vh-100 d-flex flex-column ${className}`}
      role="status"
      aria-live="polite"
    >

      {/* Centered Cameos loader */}
      <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center px-3 pb-5">
        <div
          className="cameos-loading-logo-frame d-flex align-items-center justify-content-center mb-4"
        >
          <img
            src={logoUrl}
            alt="Cameos"
            width="48"
            height="48"
            className="cameos-loading-logo"
          />
        </div>

        <div
          className="cameos-loading-spinner spinner-border text-success mb-3"
          role="status"
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
  message: PropTypes.string,
  className: PropTypes.string
};
