import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useContext, useEffect, useState } from "react";
import { FTCLiveContext } from "../contexts/FTCLiveContext";
import Table from "@cloudscape-design/components/table";
import Header from "@cloudscape-design/components/header";
import Box from "@cloudscape-design/components/box";
import { StatusIndicator } from "@cloudscape-design/components";
import { clipMatchGameplay, clipMatchPost } from "../util/aws-elemental";

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
    isClippedPost: boolean;
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
                        isClippedPost: false,
                    });
                    break;
                case 'MATCH_ABORT':
                    for (let i = items.length - 1; i >= 0; i--) {
                        if (items[i].payload.shortName === latestStreamData.payload.shortName) {
                            items[i].isAborted = true;
                            break match_type_switch;
                        }
                    }
                    console.warn("Couldn't find aborted match", latestStreamData, items);
                    break;
                case 'MATCH_COMMIT':
                    for (let i = items.length - 1; i >= 0; i--) {
                        if (items[i].payload.shortName === latestStreamData.payload.shortName) {
                            items[i].isCommitted = true;
                            if (!items[i].isClipped) {
                                clipMatchGameplay({
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
                case 'MATCH_POST':
                    for (let i = items.length - 1; i >= 0; i--) {
                        if (items[i].payload.shortName === latestStreamData.payload.shortName) {
                            if (!items[i].isClippedPost) {
                                setTimeout(() => clipMatchPost({
                                        timestamp: Math.round(latestStreamData.updateTime / 1000),   // millis to seconds
                                        eventKey: selectedEvent?.eventCode ?? 'unknown',
                                        matchName: items[i].payload.shortName,
                                        mpEndpointId: mpChannelId,
                                    })
                                        .then(() => items[i].isClippedPost = true)
                                        .catch(err => {
                                            console.error(err);
                                            items[i].isClippedError = true;
                                        })
                                        .finally(() => setItems([...items])), 30_000);
                            }
                            break match_type_switch;
                        }
                    }
                    console.warn("Couldn't find posted match", latestStreamData, items);
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
                                <StatusIndicator type={item.isAborted ? "stopped" : item.isClippedError ? 'error' : item.isClippedPost ? 'success' : item.isCommitted ? 'pending' : 'in-progress'}>
                                    {item.isAborted ? "Aborted" : item.isClippedError ? 'Error' : item.isClippedPost ? 'Succeeded' : item.isCommitted ? 'Pending' : 'In Progress'}
                                </StatusIndicator>
                            ),
                        },
                        {
                            id: 'link',
                            header: 'Clip Output*',
                            cell: item => item.isClippedPost ? <Link external target='_blank' href={`https://robotclipperstack-finalbucket3b40afdb-2gs17pofhpnt.s3.us-west-2.amazonaws.com/FTC/${selectedEvent?.eventCode}/${item.payload.shortName}.mp4`}>
                                Link
                            </Link> : <></>
                        },
                    ]}
                    empty={
                        <Box margin={{ vertical: "xs" }} textAlign="center">
                            <b>No matches yet</b>
                        </Box>
                    } />
                    <small>*Video link will only be available after processing.</small>
            </SpaceBetween>
        </Container>
    );
}
