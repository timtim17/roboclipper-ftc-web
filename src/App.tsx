import "@cloudscape-design/global-styles/index.css";
import '@aws-amplify/ui-react/styles.css';
import "./App.css";

import { useContext, useEffect, useState } from "react";
import { FTCLiveContext } from "./contexts/FTCLiveContext";
import { Mode, applyMode } from '@cloudscape-design/global-styles';
import { Channel } from "./types/ElementalMedia";
import { withAuthenticator } from '@aws-amplify/ui-react';
import * as awsui from "@cloudscape-design/design-tokens";
import Box from "@cloudscape-design/components/box";
import FinishModal from "./components/FinishModal";
import TopNavigation from "@cloudscape-design/components/top-navigation";
import Wizard from "@cloudscape-design/components/wizard";
import WizardMediaPackagePage from "./components/WizardMediaPackagePage";
import WizardScoringSystemPage from "./components/WizardScoringSystemPage";
import WizardWatchMatchesPage from "./components/WizardWatchMatchesPage";
import WizardStartStreamPage from "./components/WizardStartStreamPage";
import WizardStopStreamPage from "./components/WizardStopStreamPage";
import PreviewVideoModal from "./components/PreviewVideoModal";

const LS_DARK_THEME = 'THEME';

function App() {
    const [isDarkTheme, setIsDarkTheme] = useState(getDarkThemePreference());
    useEffect(() => {
        applyMode(isDarkTheme ? Mode.Dark : Mode.Light);
    }, [isDarkTheme,]);
    const [isWatching, setIsWatching] = useState(false);
    const [finishModalVisible, setFinishModalVisible] = useState(false);
    const [activeStepIndex, setActiveStepIndex] = useState(0);
    const [stepOneErrorText, setStepOneErrorText] = useState("");
    const [stepTwoErrorText, setStepTwoErrorText] = useState("");
    const [stepThreeErrorText, setStepThreeErrorText] = useState("");
    const [finishErrorText, setFinishErrorText] = useState("");
    const {selectedEvent} = useContext(FTCLiveContext);
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);

    return (
        <main style={{backgroundColor: awsui.colorBackgroundLayoutMain, height: "100vh", overflow: "hidden auto",}}>
            <FinishModal visible={finishModalVisible} setVisible={setFinishModalVisible} />
            {isPreviewModalVisible && <PreviewVideoModal setVisible={setIsPreviewModalVisible} selectedChannel={selectedChannel} />}
            <TopNavigation identity={{
                title: "RoboClipper for FTCLive",
                href: "#",
            }} utilities={[
                {
                    type: "button",
                    iconName: 'multiscreen',
                    title: "Stream Preview",
                    ariaLabel: "Stream Preview",
                    onClick: () => setIsPreviewModalVisible(true),
                },
                {
                    type: "button",
                    text: 'Toggle Theme',
                    title: "Change theme",
                    ariaLabel: "Change display theme",
                    disableUtilityCollapse: false,
                    onClick: () => {
                        setIsDarkTheme(!isDarkTheme);
                        localStorage.setItem(LS_DARK_THEME, (!isDarkTheme).toString());
                    },
                },
            ]} />
            <Box padding={{top: "xxs", horizontal: "xl"}}>
                <Wizard submitButtonText="Done" i18nStrings={{cancelButton: ''}}
                    isLoadingNextStep={isWatching || (activeStepIndex === 2 && !isStreaming)} onSubmit={() => {
                        if (isStreaming) {
                            setFinishErrorText("Please stop streaming before exiting.");
                            return;
                        }
                        setFinishModalVisible(true)
                    }}
                    activeStepIndex={activeStepIndex} onNavigate={e => {
                        const requestedStep = e.detail.requestedStepIndex;
                        if (requestedStep === 1 && selectedEvent === undefined) {
                            setStepOneErrorText("Please connect to the scoring system and select an event");
                            return;
                        }
                        if (requestedStep === 2 && selectedChannel === null) {
                            setStepTwoErrorText("Please select a channel");
                            return;
                        }
                        if (requestedStep === 3 && !isStreaming && e.detail.reason === 'next') {
                            setStepThreeErrorText("Please start streaming before continuing.");
                            return;
                        }
                        setActiveStepIndex(requestedStep);
                        setStepOneErrorText("");
                        setStepTwoErrorText("");
                        setStepThreeErrorText("");
                    }}
                    steps={[
                        {
                            title: "Connect to FTCLive",
                            description: "Connect to the scoring system to get information on match timings.",
                            errorText: stepOneErrorText,
                            content: <WizardScoringSystemPage setError={setStepOneErrorText} />,
                        },
                        {
                            title: "Connect to AWS",
                            description: "Select the MediaPackage Channel that should receive requests to harvest clips.",
                            errorText: stepTwoErrorText,
                            content: <WizardMediaPackagePage setError={setStepTwoErrorText} selectedChannel={selectedChannel} setSelectedChannel={setSelectedChannel} />,
                        },
                        {
                            title: "Start Streaming",
                            description: "Start the MediaLive channel before starting the stream in OBS. This will start the stream to the audience (i.e. on YouTube/Twitch).",
                            errorText: stepThreeErrorText,
                            content: <WizardStartStreamPage selectedChannel={selectedChannel} isStreaming={isStreaming} setIsStreaming={setIsStreaming} />,
                        },
                        {
                            title: "Watch for Matches",
                            description: "Leave the software running in the background to watch for matches...",
                            content: <WizardWatchMatchesPage isWatching={isWatching} setIsWatching={setIsWatching} mpChannelId={selectedChannel?.origin_endpoint_id ?? 'NEVER'} />,
                        },
                        {
                            title: "Stop Streaming",
                            description: "At the end of the day, please stop the AWS channel to stop streaming and stop incurring costs.",
                            errorText: finishErrorText,
                            content: <WizardStopStreamPage selectedChannel={selectedChannel} isStreaming={isStreaming} setIsStreaming={setIsStreaming} />,
                        },
                    ]} />
            </Box>
        </main>
    );
}

function getDarkThemePreference() {
    const storedPreference = localStorage.getItem(LS_DARK_THEME);

    if (storedPreference === null) {
        return true;
    }

    return storedPreference === 'true';
}

export default withAuthenticator(App, {
    hideSignUp: true,
    loginMechanism: 'username',
    components: {
        SignIn: {
            Footer: () => null,
        },
    },
});
