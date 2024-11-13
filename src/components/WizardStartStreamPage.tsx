import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import Grid from "@cloudscape-design/components/grid";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import { Channel } from "../types/ElementalMedia";
import { useState } from "react";
// import { invoke } from '@tauri-apps/api/core';
const invoke = (..._args: any) => Promise.reject('Not implemented');
import { PreviewVideo } from "./PreviewVideo";

interface WizardStartStreamPageProps {
    selectedChannel: Channel | null;
    isStreaming: boolean;
    setIsStreaming: (isStreaming: boolean) => void;
}

export default function WizardStartStreamPage({selectedChannel, isStreaming, setIsStreaming}: WizardStartStreamPageProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const startStreaming = () => {
        setIsLoading(true);
        invoke('start_ml_channel', {channelId: selectedChannel?.medialive_channel_id})
            .then(() => setError(null))
            .then(() => setIsStreaming(true))
            .catch(err => {
                console.error(err);
                setError(err);
            })
            .finally(() => setIsLoading(false));
    };
    return (
        <Grid gridDefinition={[{colspan: {default: 12, xs: 7,},}, {colspan: {default: 12, xs: 5,},}]}>
            <Container>
                <ol>
                    <li>
                        Configure OBS to stream to the Elemental MediaLive Channel.
                        <ul>
                            <li><b>Stream Server:</b> <code>{selectedChannel?.medialive_rtmp_url}</code></li>
                            <li><b>Stream Key:</b> <code>{selectedChannel?.medialive_rtmp_app_name}</code></li>
                        </ul>
                    </li>
                    <li>
                        Start the selected channel (<code>{selectedChannel?.id})</code><br />
                        <SpaceBetween size="xs" direction="horizontal" alignItems="center">
                            <Button variant="primary" onClick={startStreaming} disabled={isStreaming} loading={isLoading}>Start MediaLive Channel</Button>
                            {isStreaming && <StatusIndicator type="success">Done</StatusIndicator>}
                            {error && <StatusIndicator type="error">{error}</StatusIndicator>}
                        </SpaceBetween>
                    </li>
                    <li>Wait 10-30 seconds.</li>
                    <li>
                        Start streaming in OBS. If it takes some time to connect or gives a
                        "Failed to connect to server" error, wait some more time and try again.
                    </li>
                </ol>
            </Container>
            <Container>
                <SpaceBetween size="xs" alignItems="center">
                    <PreviewVideo selectedChannel={selectedChannel} isStreaming={isStreaming} />
                    <em>Stream Preview</em>
                </SpaceBetween>
            </Container>
        </Grid>
    );
}
