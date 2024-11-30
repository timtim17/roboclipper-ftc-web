import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import I18nProvider from "@cloudscape-design/components/i18n";
import enMessages from '@cloudscape-design/components/i18n/messages/all.en';
import { Amplify } from "aws-amplify";
import amplifyOutputs from "../amplify_outputs.json";
import { applyTheme, Theme } from "@cloudscape-design/components/theming";
import { Theme as AmplifyTheme, ThemeProvider } from '@aws-amplify/ui-react';
import { FTCLiveProvider } from "./contexts/FTCLiveContext";
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://647d446c00c05dbf19226508677f8edb@o4508362119839744.ingest.us.sentry.io/4508362122461184",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
    Sentry.captureConsoleIntegration(),
  ],
  // Tracing
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ["localhost", /^https:\/\/clip.ftc.tools/],
  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});

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

const container = document.getElementById('root') as HTMLElement;
const root = ReactDOM.createRoot(container);
root.render(
  <React.StrictMode>
    <I18nProvider messages={[enMessages,]} locale="en">
        <FTCLiveProvider>
            <ThemeProvider theme={amplifyTheme}>
                <Sentry.ErrorBoundary showDialog>
                    <App />
                </Sentry.ErrorBoundary>
            </ThemeProvider>
        </FTCLiveProvider>
    </I18nProvider>
  </React.StrictMode>,
);
