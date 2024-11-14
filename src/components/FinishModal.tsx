import Header from "@cloudscape-design/components/header";
import Modal from "@cloudscape-design/components/modal";
import SpaceBetween from "@cloudscape-design/components/space-between";

interface FinishModalProps {
    visible: boolean;
    setVisible: (value: boolean) => void;
}

export default function FinishModal({visible, setVisible}: FinishModalProps) {
    const isObs = 'obsstudio' in window;
    return (
        <Modal visible={visible} onDismiss={() => setVisible(false)}
            header={<Header variant="h2">{isObs ? "Can't exit an OBS dock..." : "Close the tab to exit"}</Header>}>
            <SpaceBetween size="xs" direction="vertical" alignItems="center">
                <img src="/close-modal.gif" style={{margin: 'auto', display: 'block',}} />
                {!isObs && <small><em>(Javascript <a href="https://developer.mozilla.org/en-US/docs/Web/API/Window/close">can't</a> close tabs that it didn't open)</em></small>}
                <span>¯\_(ツ)_/¯</span>
            </SpaceBetween>
        </Modal>
    )
}
