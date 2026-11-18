import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './index.css'

import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { LanguageProvider } from "./contexts/LanguageContext.jsx";
import { DeviceProvider } from "./contexts/DeviceContext.jsx";
import { NetworkProvider } from "./contexts/NetworkContext.jsx";
import { prepareOAuthCallbackRoute } from "./backend/user/authentication.js";

prepareOAuthCallbackRoute();

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <BrowserRouter useTransitions={false}>
            <NetworkProvider>
                <AuthProvider>
                    <LanguageProvider>
                        <DeviceProvider>
                            <App />
                        </DeviceProvider>
                    </LanguageProvider>
                </AuthProvider>
            </NetworkProvider>
        </BrowserRouter>
    </StrictMode>,
)
