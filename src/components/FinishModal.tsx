import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Header from "@cloudscape-design/components/header";
import Modal from "@cloudscape-design/components/modal";
import SpaceBetween from "@cloudscape-design/components/space-between";
// import { exit } from '@tauri-apps/plugin-process';
const exit = window.close.bind(window);

interface FinishModalProps {
    visible: boolean;
    setVisible: (value: boolean) => void;
}

export default function FinishModal({visible, setVisible}: FinishModalProps) {
    return (
        <Modal visible={visible} onDismiss={() => setVisible(false)}
            header={<Header variant="h2">Close program?</Header>}
            footer={
                <Box float="right">
                    <SpaceBetween size="xxs" direction="horizontal">
                        <Button onClick={async () => await exit()}>Yes</Button>
                        <Button onClick={() => setVisible(false)}>No</Button>
                    </SpaceBetween>
                </Box>
            }>
                Are you sure you want to exit?
                You will need to restart setup to continue clipping matches.
        </Modal>
    )
}
