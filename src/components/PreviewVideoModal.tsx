import Header from "@cloudscape-design/components/header";
import Modal from "@cloudscape-design/components/modal";
import { PreviewVideo } from "./PreviewVideo";
import { Channel } from "../types/ElementalMedia";

interface PreviewVideoModalProps {
    setVisible: (value: boolean) => void;
    selectedChannel: Channel | null;
}

export default function PreviewVideoModal({setVisible, selectedChannel}: PreviewVideoModalProps) {
    return (
        <Modal visible onDismiss={() => setVisible(false)}
            header={<Header variant="h2">Stream Preview</Header>}>
                {selectedChannel == null ? <p style={{textAlign: 'center',}}>Not linked to a channel, nothing to preview.</p> :
                 <PreviewVideo selectedChannel={selectedChannel} disableDelayedReload={true} />}
        </Modal>
    )
}
