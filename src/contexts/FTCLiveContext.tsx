// Largely ripped off from https://github.com/jvens/obs-ftc/blob/main/src/contexts/FTCLiveContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Event, FTCLiveSteamData, UpdateType } from '../types/FTCLive.tsx';

type FTCLiveProviderProps = {
  children: ReactNode;
};

// Define the context data types
interface FTCLiveContextData {
  serverUrl: string;
  setServerUrl: React.Dispatch<React.SetStateAction<string>>;
  selectedEvent?: Event;
  setSelectedEvent: React.Dispatch<React.SetStateAction<Event|undefined>>;
  isConnected: boolean;
  allStreamData: FTCLiveSteamData[];
  latestStreamData?: FTCLiveSteamData;
  connectWebSocket: (connect: boolean) => void;
  selectedTriggers: UpdateType[];
  setSelectedTriggers: React.Dispatch<React.SetStateAction<UpdateType[]>>;
}

export const FTCLiveContext = createContext<FTCLiveContextData>({} as FTCLiveContextData);

export const useFTCLive = () => {
  return useContext(FTCLiveContext);
};

// WebSocketProvider component that will wrap your application or part of it
export const FTCLiveProvider: React.FC<FTCLiveProviderProps> = ({ children }) => {
  const [serverUrl, setServerUrl] = useState<string>('localhost');
  const [selectedEvent, setSelectedEvent] = useState<Event|undefined>(undefined);
  const [allStreamData, setAllStreamData] = useState<FTCLiveSteamData[]>([]);
  const [latestStreamData, setLatestStreamData] = useState<FTCLiveSteamData|undefined>();
  const [isConnected, setConnected] = useState<boolean>(false);
  const [socket, setSocket] = useState<WebSocket | undefined>();
  const [selectedTriggers, setSelectedTriggers] = useState<UpdateType[]>(['MATCH_START', 'MATCH_COMMIT', 'MATCH_ABORT', 'MATCH_POST',]);

  // The function to connect the WebSocket and handle messages
  const connectWebSocket = useCallback((connect: boolean) => {
    if (selectedEvent && connect) {
      const socket = new WebSocket(`ws://${serverUrl}/api/v2/stream/?code=${selectedEvent.eventCode}`);
      setSocket(socket)

      socket.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
      };

      socket.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      socket.onmessage = (message) => {
        const data = message.data;
        if (data === 'pong') return; // ignore pong messages

        const streamData = JSON.parse(data) as FTCLiveSteamData;
        console.log('Websocket Message: ', streamData)
        if (selectedTriggers.some(trigger => trigger === streamData.updateType)) {
            setAllStreamData(prevMessages => [...prevMessages, streamData]);
            setLatestStreamData(streamData);
        }
      }
    } else if (!connect) {
      socket?.close();
      setConnected(false);
    }
  }, [serverUrl, socket, selectedEvent, selectedTriggers, setAllStreamData]);


  // Provide the context value to children
  return (
    <FTCLiveContext.Provider value={{ serverUrl, setServerUrl, selectedEvent, setSelectedEvent, allStreamData, connectWebSocket, isConnected, latestStreamData, selectedTriggers, setSelectedTriggers }}>
      {children}
    </FTCLiveContext.Provider>
  );
};
