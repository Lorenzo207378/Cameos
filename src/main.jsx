import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './css/common/theme.css'
import './css/common/utilities.css'
import './css/common/elements.css'
import './css/common/carouselControls.css'
import './css/common/text.css'
import './index.css'

import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { LanguageProvider } from "./contexts/LanguageContext.jsx";
import { DeviceProvider } from "./contexts/DeviceContext.jsx";

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <LanguageProvider>
                    <DeviceProvider>
                        <App />
                    </DeviceProvider>
                </LanguageProvider>
            </AuthProvider>
        </BrowserRouter>
    </StrictMode>,
)
