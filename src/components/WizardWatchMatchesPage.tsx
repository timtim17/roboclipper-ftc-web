import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useContext, useEffect, useState } from "react";
import { FTCLiveContext } from "../contexts/FTCLiveContext";
import Table from "@cloudscape-design/components/table";
import Header from "@cloudscape-design/components/header";
import Box from "@cloudscape-design/components/box";
import { StatusIndicator } from "@cloudscape-design/components";
import { clipMatch } from "../util/aws-elemental";

interface WizardWatchMatchesPageProps {
    isWatching: boolean;
    setIsWatching: (value: boolean) => void;
    mpChannelId: string;
}

interface MatchItem {
    payload: {
        shortName: string;
        number: number;
        field: number;
    };
    updateTime: number;
    isAborted: boolean;
    isCommitted: boolean;
    isClipped: boolean;
    isClippedError: boolean;
}

export default function WizardWatchMatchesPage({isWatching, setIsWatching, mpChannelId}: WizardWatchMatchesPageProps) {
    const {connectWebSocket, latestStreamData, selectedEvent} = useContext(FTCLiveContext)
    const watching = (value: boolean) => {
        setIsWatching(value);
        connectWebSocket(value);
    };
    const [items, setItems] = useState<MatchItem[]>([]);
    useEffect(() => {
        if (latestStreamData) {
            match_type_switch:
            switch (latestStreamData.updateType) {
                case 'MATCH_START':
                    items.push({
                        ...latestStreamData,
                        isAborted: false,
                        isCommitted: false,
                        isClipped: false,
                        isClippedError: false,
                    });
                    break;
                case 'MATCH_ABORT':
                    for (let i = items.length - 1; i >= 0; i--) {
                        if (items[i].payload.number === latestStreamData.payload.number) {
                            items[i].isAborted = true;
                            break match_type_switch;
                        }
                    }
                    console.warn("Couldn't find aborted match", latestStreamData, items);
                    break;
                case 'MATCH_COMMIT':
                    for (let i = items.length - 1; i >= 0; i--) {
                        if (items[i].payload.number === latestStreamData.payload.number) {
                            items[i].isCommitted = true;
                            if (!items[i].isClipped) {
                                console.log({
                                    timestamp: Math.round(items[i].updateTime / 1000),   // millis to seconds
                                    eventKey: selectedEvent?.eventCode,
                                    matchName: items[i].payload.shortName,
                                    mpEndpointId: mpChannelId,
                                });
                                clipMatch({
                                    timestamp: Math.round(items[i].updateTime / 1000),   // millis to seconds
                                    eventKey: selectedEvent?.eventCode ?? 'unknown',
                                    matchName: items[i].payload.shortName,
                                    mpEndpointId: mpChannelId,
                                })
                                    .then(() => items[i].isClipped = true)
                                    .catch(err => {
                                        console.error(err);
                                        items[i].isClippedError = true;
                                    })
                                    .finally(() => setItems([...items]));
                            }
                            break match_type_switch;
                        }
                    }
                    console.warn("Couldn't find committed match", latestStreamData, items);
                    break;
            }
            setItems([...items]);
        }
    }, [latestStreamData]);

    return (
        <Container>
            <SpaceBetween direction="vertical" size="s">
                <SpaceBetween size="s" direction="horizontal">
                    <Button onClick={() => watching(true)} iconName="caret-right-filled" variant="primary" loading={isWatching}>Start Watching</Button>
                    <Button iconName="close" onClick={() => watching(false)} disabled={!isWatching}>Stop Watching</Button>
                </SpaceBetween>
                <Table header={<Header>{selectedEvent?.name ?? ''} Matches</Header>} items={items} sortingDisabled
                    columnDefinitions={[
                        {
                            id: "match",
                            header: "Match",
                            cell: item => item.payload.shortName,
                            sortingField: "payload.shortName",
                            isRowHeader: true,
                            width: 5,
                        },
                        {
                            id: "timestamp",
                            header: "Start Timestamp",
                            cell: item => item.updateTime,
                            sortingField: "updateTime",
                            width: 13,
                        },
                        {
                            id: "status",
                            header: "Status",
                            cell: item => (
                                <StatusIndicator type={item.isAborted ? "stopped" : item.isClippedError ? 'error' : item.isClipped ? 'success' : item.isCommitted ? 'pending' : 'in-progress'}>
                                    {item.isAborted ? "Aborted" : item.isClippedError ? 'Error' : item.isClipped ? 'Succeeded' : item.isCommitted ? 'Pending' : 'In Progress'}
                                </StatusIndicator>
                            ),
                        },
                    ]}
                    empty={
                        <Box margin={{ vertical: "xs" }} textAlign="center">
                            <b>No matches yet</b>
                        </Box>
                    } />
            </SpaceBetween>
        </Container>
    );
}
