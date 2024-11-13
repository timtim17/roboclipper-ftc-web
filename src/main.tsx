import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import I18nProvider from "@cloudscape-design/components/i18n";
import enMessages from '@cloudscape-design/components/i18n/messages/all.en';
import { applyTheme, Theme } from "@cloudscape-design/components/theming";
import { FTCLiveProvider } from "./contexts/FTCLiveContext";

const theme: Theme = {
    tokens: {
    },
    contexts: {
        'top-navigation': {
            tokens: {
                colorBackgroundContainerContent: '#f08f4a',
                colorTextInteractiveDefault: '#333',
                colorTextInteractiveHover: '#666',
                colorTextTopNavigationTitle: '#333',
                colorTextAccent: '#666',
            },
        },
    },
};

applyTheme({theme});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <I18nProvider messages={[enMessages,]} locale="en">
        <FTCLiveProvider>
            <App />
        </FTCLiveProvider>
    </I18nProvider>
  </React.StrictMode>,
);
