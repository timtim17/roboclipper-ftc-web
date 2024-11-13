import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Hls from "hls.js";
import { useEffect, useRef } from "react";
import { Channel } from "../types/ElementalMedia";

interface PreviewVideoProps {
    selectedChannel: Channel | null;
    isStreaming?: boolean;
    disableDelayedReload?: boolean;
}

export function PreviewVideo({selectedChannel, isStreaming, disableDelayedReload = false}: PreviewVideoProps) {
    const video = useRef<HTMLVideoElement>(null);
    if (Hls.isSupported()) {
        const hls = useRef<Hls | null>(null);
        const updateHls = () => {
            if (hls.current == null) {
                hls.current = new Hls();
            }
            console.log(selectedChannel);
            if (selectedChannel && selectedChannel.origin_endpoint_url && video.current) {
                hls.current!.loadSource(selectedChannel.origin_endpoint_url);
                hls.current!.attachMedia(video.current);
                hls.current!.on(Hls.Events.MANIFEST_PARSED, () => video.current?.play());
            }
        };
        useEffect(() => {
            updateHls();
            return () => {
                hls.current!.destroy();
                hls.current = null;
            };
        }, []);
        useEffect(() => {
            if (!disableDelayedReload) {
                setTimeout(updateHls, 30_000);
            }
        }, [isStreaming]);
        return (
            <>
                <SpaceBetween direction="vertical" size="xs" alignItems="center">
                    <Button variant="normal" onClick={updateHls}>Refresh Preview</Button>
                    <video ref={video} style={{width: '100%'}} muted />
                </SpaceBetween>
            </>
        );
    } else {
        return <p>Preview not supported</p>;
    }
}
