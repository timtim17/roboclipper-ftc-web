import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import ExpandingSection from "@cloudscape-design/components/expandable-section";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useContext, useEffect, useState } from "react";
import { FTCLiveContext } from "../contexts/FTCLiveContext";
import Select, { SelectProps } from "@cloudscape-design/components/select";
import { Event } from "../types/FTCLive";
import Badge from "@cloudscape-design/components/badge";

interface WizardScoringSystemPageProps {
    setError: (value: string) => void;
}

export default function WizardScoringSystemPage({setError}: WizardScoringSystemPageProps) {
    const {serverUrl, setServerUrl, setSelectedEvent} = useContext(FTCLiveContext);
    const [events, setEvents] = useState<Event[]>([]);
    const [isConnected, setIsConnected] = useState(false);

    const refreshEvents = async () => {
        setIsRefreshingEvents(true);
        try {
            const response = await fetch(`http://${serverUrl}/api/v1/events/`);
            const eventCodes = (await response.json()).eventCodes;
            const events: Event[] = await Promise.all(eventCodes.map(async (code: string): Promise<Event> => {
                const response = await fetch(`http://${serverUrl}/api/v1/events/${code}/`);
                const event = await response.json() as Event;
                return event;
            }));
            setEvents(events);
            setError('');
            setIsConnected(true);
        } catch (error) {
            console.error('Fetching events failed:', error);
            setError('Error connecting to scoring system');
            setIsConnected(false);
        } finally {
            setIsRefreshingEvents(false);
        }
    }
    const [isRefreshingEvents, setIsRefreshingEvents] = useState(false);
    const [options, setOptions] = useState<SelectProps.Options>([]);
    const [selectedOption, setSelectedOption] = useState<null | SelectProps.Option>(null);
    useEffect(() => {
        console.log('updated events');
        setOptions(events.map(event => ({label: event.name, value: event.eventCode})));
    }, [events]);
    useEffect(() => {
        if (selectedOption !== null) {
            setSelectedEvent(events.find(e => e.eventCode === selectedOption.value))
        }
    }, [selectedOption]);

    return (
        <Container header={
            <Header variant="h2">
                Scoring System Info
            </Header>
        }>
            <SpaceBetween direction="vertical" size="l">
                <FormField label={<>Scoring System IP {isConnected && <Badge color="green">Connected</Badge>}</>}
                    secondaryControl={<Button onClick={refreshEvents} loading={isRefreshingEvents}>Sync events</Button>}>
                    <Input value={serverUrl}
                        placeholder="Enter server IP"
                        onChange={e => setServerUrl(e.detail.value)} />
                </FormField>
                <FormField label="Event">
                    <Select selectedOption={selectedOption} disabled={!isConnected} options={options}
                        filteringType="auto" placeholder="Select an event" empty="No events found"
                        invalid={selectedOption != null && !events.some(event => event.eventCode === selectedOption.value)}
                        onChange={ev => setSelectedOption(ev.detail.selectedOption)} />
                </FormField>
                <ExpandingSection headerText="Issues connecting to FTCLive?">
                    <p>Try connecting to the scoring system in another tab to verify that it is accessible.</p>
                    <p>
                        You may need to enable "Insecure content" in your browser settings for this
                        tool to access the scoring system. For example, in Chrome:
                    </p>
                    <ol>
                        <li>
                            Select the icon next to the URL and go to "Site settings"<br />
                            <img src="/insecure_content_1.png" />
                        </li>
                        <li>
                            Find "Insecure content" and set it to "Allow"<br />
                            <img src="/insecure_content_2.png" />
                        </li>
                        <li>
                            Refresh this page<br />
                            <Button onClick={() => location.reload()}>Refresh</Button>
                        </li>
                    </ol>
                </ExpandingSection>
            </SpaceBetween>
        </Container>
    );
}
