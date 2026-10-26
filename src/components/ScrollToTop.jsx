import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * ScrollToTop
 * Gestisce lo scrolling della finestra su cambio pagina:
 * - Se la navigazione è PUSH o REPLACE (nuova pagina), porta lo scroll a (0, 0).
 * - Se la navigazione è POP (pulsante Indietro/Avanti del browser o navigate(-1)),
 *   lascia che il browser ripristini la posizione di scorrimento precedente.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if (navType !== 'POP') {
      window.scrollTo(0, 0);
    }
  }, [pathname, navType]);

  return null;
}
