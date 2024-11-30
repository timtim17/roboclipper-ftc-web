import { AwsCredentialIdentity } from '@aws-sdk/types';
import { MediaLiveClient, ListChannelsCommand, DescribeInputCommand, StartChannelCommand, StopChannelCommand } from '@aws-sdk/client-medialive';
import { CreateHarvestJobCommand, GetOriginEndpointCommand, MediaPackageV2Client } from '@aws-sdk/client-mediapackagev2';
import { Channel } from '../types/ElementalMedia';
import { getCredentials } from './aws-credentials';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';

function createMediaLiveClient(credentials: AwsCredentialIdentity) {
    return new MediaLiveClient({
        region: 'us-west-2',
        credentials,
    });
}

function createMediaPackageClient(credentials: AwsCredentialIdentity) {
    return new MediaPackageV2Client({
        region: 'us-west-2',
        credentials,
    });
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
            const settings = channel.Destinations?.find(destination =>
                destination.Settings && destination.Settings.length > 0
            )?.Settings;

            if (settings) {
                const url = settings[0].Url|| '';
                const regex = /\/RoboClipper\/[12]\/([^\/]+)\/index/;
                const urlMatch = url.match(regex);
                const channelName = urlMatch ? urlMatch[1] : '';

                const endpointResponse = await mpClient.send(new GetOriginEndpointCommand({
                    ChannelGroupName: 'RoboClipper',
                    ChannelName: channelName,
                    OriginEndpointName: 'main',
                }));
                const manifests = endpointResponse.LowLatencyHlsManifests;
                const endpointUrl = (manifests && manifests.length > 0) ? manifests[0].Url ?? '' : '';

                const inputId = channel.InputAttachments?.[0]?.InputId || '';
                const inputResponse = await mlClient.send(new DescribeInputCommand({
                    InputId: inputId
                }));

                const inputUrl = inputResponse.Destinations?.[0]?.Url || '';
                const [rtmpUrl, rtmpAppName] = splitRtmpUrl(inputUrl);

                result.push({
                    id: channelName,
                    arn: channel.Arn || '',
                    origin_endpoint_id: channelName,
                    origin_endpoint_url: endpointUrl,
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
    timestamp: Date;
    eventKey: string;
    matchName: string;
    mpEndpointId: string;
}

interface HarvestJobParamsInternal extends HarvestJobParams {
    part: number;
    maxParts: number;
    startTime: Date,
    endTime: Date,
}

// TODO: put these somewhere better
const DESTINATION_BUCKET_NAME = 'robotclipperstack-intermediatebucketc22de796-8eq47dcme2nq';

export async function clipMatchGameplay(params: HarvestJobParams) {
    clipMatch({
        ...params,
        part: 1,
        maxParts: 2,
        startTime: new Date(params.timestamp.getTime() - 10 * 1000), // start time minus 10s
        endTime: new Date(params.timestamp.getTime() + 165 * 1000), // start time plus 2m45s (165s)
    });
}

export async function clipMatchPost(params: HarvestJobParams) {
    clipMatch({
        ...params,
        part: 2,
        maxParts: 2,
        startTime: params.timestamp, // post time +/- 0
        endTime: new Date(params.timestamp.getTime() + 30 * 1000), // post time plus 30s
    });
    // bandaid solution: because EMPv2 isn't integrated with EventBridge or Step Functions,
    // manually trigger the Transcode Lambda after ~60 seconds (ew). TODO: fix this
    setTimeout(async () => {
        const credentials = await getCredentials();
        const client = new LambdaClient({
            region: 'us-west-2',
            credentials,
        });
        try {
            await client.send(new InvokeCommand({
                FunctionName: 'RobotClipperStack-TransLambda8F087F05-PR9MoqT4hcVu',
                InvocationType: 'Event',
                Payload: JSON.stringify({
                    'detail-type': 'MediaPackage HarvestJob Notification',
                    source: 'aus-roboclipper-fakeemp',
                    detail: {
                        harvest_job: {
                            "s3_destination": {
                                "bucket_name": DESTINATION_BUCKET_NAME,
                                "manifest_key": `${buildKey(params.eventKey, params.matchName)}/2_2/index.m3u8`,
                            },
                        },
                    },
                }),
            }));
        } catch (err) {
            console.error(err);
        }
    }, 60_000);
}

export async function clipMatch({ 
    eventKey,
    matchName,
    mpEndpointId,
    part,
    maxParts,
    startTime,
    endTime,
} : HarvestJobParamsInternal) {
    if (part > maxParts) {
        throw new Error(`Part number ${part} is greater than the maximum number of parts ${maxParts}`);
    }
    try {
        const credentials = await getCredentials();
        const client = await createMediaPackageClient(credentials);
        const fileNameKey = buildKey(eventKey, matchName);
        const harvestEpoch = Math.floor(Date.now() / 1000);
        await client.send(new CreateHarvestJobCommand({
            ChannelGroupName: 'RoboClipper',
            ChannelName: mpEndpointId,
            OriginEndpointName: 'main',
            HarvestJobName: `${harvestEpoch}-${fileNameKey}-${part}`,
            HarvestedManifests: {
                LowLatencyHlsManifests: [
                    {
                        ManifestName: 'index',
                    },
                ],
            },
            Destination: {
                S3Destination: {
                    BucketName: DESTINATION_BUCKET_NAME,
                    DestinationPath: `${fileNameKey}/${part}_${maxParts}`,
                },
            },
            ScheduleConfiguration: {
                StartTime: startTime,
                EndTime: endTime,
            }
        }));
    } catch (err) {
        console.error(err);
        throw err;
    }
}

function buildKey(eventKey: string, matchName: string) {
    return `FTC_${eventKey.toLowerCase()}_${matchName}`;
}
