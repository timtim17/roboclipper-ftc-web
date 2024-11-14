import { useEffect, useState } from "react";
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Header from '@cloudscape-design/components/header';
import Table from "@cloudscape-design/components/table";
import { Channel } from "../types/ElementalMedia";
import { fetchMediaLiveChannels } from "../util/aws-elemental";

interface WizardMediaPackagePageProps {
    setError: (value: string) => void;
    selectedChannel: Channel | null;
    setSelectedChannel: (value: Channel) => void;
}

export default function WizardMediaPackagePage({setError, selectedChannel, setSelectedChannel}: WizardMediaPackagePageProps) {
    const [isFetchingChannels, setFetchingChannels] = useState(false);
    const [channels, setChannels] = useState<Channel[]>([]);
    const fetchChannels = () => {
        setFetchingChannels(true);
        fetchMediaLiveChannels()
            .then(data => setChannels(data as Channel[]))
            .then(() => setError(""))
            .then(() => setFetchingChannels(false))
            .catch(err => {
                console.error(err);
                setError('Error fetching channels.');
            });
    };
    useEffect(fetchChannels, []);
    return (
        <Table items={channels} loading={isFetchingChannels} selectionType="single"
            onSelectionChange={({ detail }) =>
                setSelectedChannel(detail.selectedItems[0])
            }
            selectedItems={selectedChannel == null ? undefined : [selectedChannel]}
            columnDefinitions={[
                {
                    id: "id",
                    header: "Id",
                    cell: item => item.id,
                    sortingField: "id",
                    isRowHeader: true,
                    width: 5,
                },
                {
                    id: "arn",
                    header: "MediaLive ARN",
                    cell: item => item.arn,
                    sortingField: "arn",
                    width: 13,
                },
            ]}
            header={
                <Header variant="h3" actions={<Button iconName="refresh" onClick={fetchChannels} loading={isFetchingChannels} />}>
                    MediaPackage Channels
                </Header>
            }
            empty={
                <Box margin={{ vertical: "xs" }} textAlign="center">
                    <b>No Channels Found</b>
                </Box>
            } />
    );
}
