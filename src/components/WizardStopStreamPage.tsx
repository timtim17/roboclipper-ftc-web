import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import { Channel } from "../types/ElementalMedia";
import { useState } from "react";
import { stopMediaLiveChannel } from "../util/aws-elemental";

interface WizardStopStreamPageProps {
    selectedChannel: Channel | null;
    isStreaming: boolean;
    setIsStreaming: (isStreaming: boolean) => void;
}

export default function WizardStopStreamPage({selectedChannel, isStreaming, setIsStreaming}: WizardStopStreamPageProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const stopStreaming = () => {
        if (selectedChannel == null) return;
        setIsLoading(true);
        stopMediaLiveChannel(selectedChannel.medialive_channel_id)
            .then(() => setError(null))
            .then(() => setIsStreaming(false))
            .catch(err => {
                console.error(err);
                setError(err);
            })
            .finally(() => setIsLoading(false));
    };
    return (
        <Container>
            <ol>
                <li>
                    Stop the selected channel: <code>{selectedChannel?.id}</code><br />
                    <SpaceBetween size="xs" direction="horizontal" alignItems="center">
                        <Button variant="primary" onClick={stopStreaming} disabled={!isStreaming} loading={isLoading}>Stop MediaLive Channel</Button>
                        {!isStreaming && <StatusIndicator type="success">Done</StatusIndicator>}
                        {error && <StatusIndicator type="error">{error}</StatusIndicator>}
                    </SpaceBetween>
                </li>
                <li>Stop streaming in OBS.</li>
                <li>Happy teardown! ☺️</li>
            </ol>
        </Container>
    );
}
