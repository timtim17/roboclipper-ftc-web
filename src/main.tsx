import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import I18nProvider from "@cloudscape-design/components/i18n";
import enMessages from '@cloudscape-design/components/i18n/messages/all.en';
import { Amplify } from "aws-amplify"
import amplifyOutputs from "../amplify_outputs.json"
import { applyTheme, Theme } from "@cloudscape-design/components/theming";
import { Theme as AmplifyTheme, ThemeProvider } from '@aws-amplify/ui-react';
import { FTCLiveProvider } from "./contexts/FTCLiveContext";

Amplify.configure(amplifyOutputs);

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

const amplifyTheme: AmplifyTheme = {
    name: 'ftclive-amplify-theme',
    tokens: {
        components: {
            button: {
                primary: {
                  backgroundColor: '#f08f4a',
                  _hover: {
                    backgroundColor: '#0083AE',
                  },
                  _focus: {
                    backgroundColor: '#0083AE',
                  }
                },
                link: {
                  color: '#0083AE',
                },
            },
            fieldcontrol: {
                _focus: {
                    boxShadow: '0 0 0 2px #ABD8E7',
                },
            },
        },
    },
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <I18nProvider messages={[enMessages,]} locale="en">
        <FTCLiveProvider>
            <ThemeProvider theme={amplifyTheme}>
                <App />
            </ThemeProvider>
        </FTCLiveProvider>
    </I18nProvider>
  </React.StrictMode>,
);
