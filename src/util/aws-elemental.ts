import { fetchAuthSession } from 'aws-amplify/auth';
import { AwsCredentialIdentity } from '@aws-sdk/types';
import { MediaLiveClient, ListChannelsCommand, DescribeInputCommand, StartChannelCommand, StopChannelCommand } from '@aws-sdk/client-medialive';
import { CreateHarvestJobCommand, ListOriginEndpointsCommand, MediaPackageClient } from '@aws-sdk/client-mediapackage';
import { Channel } from '../types/ElementalMedia';

function createMediaLiveClient(credentials: AwsCredentialIdentity) {
    return new MediaLiveClient({
        region: 'us-west-2',
        credentials,
    });
}

function createMediaPackageClient(credentials: AwsCredentialIdentity) {
    return new MediaPackageClient({
        region: 'us-west-2',
        credentials,
    });
}

async function getCredentials() {
    const { credentials } = await fetchAuthSession();
    if (!credentials) throw new Error('Attempted to fetch credentials when not authenticated');
    return credentials;
}

export async function fetchMediaLiveChannels() {
    try {
        const credentials = await getCredentials();
        const mlClient = createMediaLiveClient(credentials);
        const mpClient = createMediaPackageClient(credentials);
        const result: Channel[] = [];

        const listChannelsResponse = await mlClient.send(new ListChannelsCommand({}));
        const channels = listChannelsResponse.Channels || [];

        for (const channel of channels) {
            const mpSettings = channel.Destinations?.find(destination =>
                destination.MediaPackageSettings && destination.MediaPackageSettings.length > 0
            )?.MediaPackageSettings;

            if (mpSettings) {
                const mpChannelId = mpSettings[0].ChannelId || '';

                const endpointsResponse = await mpClient.send(new ListOriginEndpointsCommand({
                    ChannelId: mpChannelId
                }));
                const endpoints = endpointsResponse.OriginEndpoints || [];

                const inputId = channel.InputAttachments?.[0]?.InputId || '';
                const inputResponse = await mlClient.send(new DescribeInputCommand({
                    InputId: inputId
                }));

                const inputUrl = inputResponse.Destinations?.[0]?.Url || '';
                const [rtmpUrl, rtmpAppName] = splitRtmpUrl(inputUrl);

                result.push({
                    id: mpChannelId,
                    arn: channel.Arn || '',
                    origin_endpoint_id: endpoints[0]?.Id || '',
                    origin_endpoint_url: endpoints[0]?.Url || '',
                    medialive_channel_id: channel.Id || '',
                    medialive_rtmp_url: rtmpUrl,
                    medialive_rtmp_app_name: rtmpAppName
                });
            }
        }

        return result;
    } catch (err) {
        console.error(err);
        throw err;
    }
}

function splitRtmpUrl(url: string): [string, string] {
    if (url.startsWith('rtmp://')) {
        const stripped = url.slice(7); // remove 'rtmp://'
        const slashIndex = stripped.indexOf('/');

        if (slashIndex !== -1) {
            const base = stripped.slice(0, slashIndex);
            const app = stripped.slice(slashIndex + 1);
            return [`rtmp://${base}`, app];
        }
        return [url, ''];
    }
    return [url, ''];
}


export async function startMediaLiveChannel(channelId: string) {
    if (!channelId) return;
    try {
        const credentials = await getCredentials();
        const mlClient = createMediaLiveClient(credentials);
        await mlClient.send(new StartChannelCommand({
            ChannelId: channelId,
        }));
    } catch (err) {
        console.error(err);
        throw err;
    }
}

export async function stopMediaLiveChannel(channelId: string) {
    if (!channelId) return;
    try {
        const credentials = await getCredentials();
        const mlClient = createMediaLiveClient(credentials);
        await mlClient.send(new StopChannelCommand({
            ChannelId: channelId,
        }));
    } catch (err) {
        console.error(err);
        throw err;
    }
}

interface HarvestJobParams {
    timestamp: number;
    eventKey: string;
    matchName: string;
    mpEndpointId: string;
}

// TODO: put these somewhere better
const DESTINATION_BUCKET_NAME = 'robotclipperstack-intermediatebucketc22de796-8eq47dcme2nq';
const IAM_HARVEST_ROLE = 'arn:aws:iam::267253737119:role/RobotClipperStack-IAMHarvestRole03C319BB-6UVcrXeUeVYK';

export async function clipMatch({ 
    timestamp, 
    eventKey, 
    matchName, 
    mpEndpointId 
} : HarvestJobParams) {
    try {
        const credentials = await getCredentials();
        const client = await createMediaPackageClient(credentials);
        const fileNameKey = buildKey(eventKey, matchName);
        const harvestEpoch = Math.floor(Date.now() / 1000);
        const startTime = timestamp - 10; // start time minus 10s
        const endTime = timestamp + 165; // start time plus 2m45s (165s)
        await client.send(new CreateHarvestJobCommand({
            Id: `${harvestEpoch}-${fileNameKey}`,
            OriginEndpointId: mpEndpointId,
            S3Destination: {
                BucketName: DESTINATION_BUCKET_NAME,
                ManifestKey: `${fileNameKey}/${fileNameKey}.m3u8`,
                RoleArn: IAM_HARVEST_ROLE
            },
            StartTime: startTime.toString(),
            EndTime: endTime.toString()
        }));
    } catch (err) {
        console.error(err);
        throw err;
    }
}

function buildKey(eventKey: string, matchName: string) {
    return `FTC_${eventKey.toLowerCase()}_${matchName}`;
}
