import React, { createContext, useContext, useEffect, useRef } from 'react';
import { CloudWatchLogsClient, CreateLogStreamCommand, PutLogEventsCommand, } from '@aws-sdk/client-cloudwatch-logs';
import { getCredentials } from '../util/aws-credentials';

interface LogEntry {
    message: string;
    timestamp: number;
}

interface LogBatch {
    [logStreamName: string]: LogEntry[];
}

interface CWLoggingContextType {
    log: (eventCode: string, message: string) => Promise<void>;
    flushLogs: () => Promise<void>;
}

const MAX_BATCH_SIZE = 1048576; // Maximum size in bytes for PutLogEvents
const MAX_BATCH_COUNT = 10000; // Maximum number of log events in one batch
const LOG_GROUP_NAME = 'roboclipper-ftc';

const CWLoggingContext = createContext<CWLoggingContextType | undefined>(undefined);

export const CWLoggingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const cwClient = useRef<CloudWatchLogsClient>();
    const logBatches = useRef<LogBatch>({});
    const periodicLoggingTimer = useRef<NodeJS.Timeout | undefined>(undefined);

    useEffect(() => {
        getCredentials()
            .then(credentials => {
                cwClient.current = new CloudWatchLogsClient({
                    region: 'us-west-2',
                    credentials,
                });
                periodicLoggingTimer.current = setInterval(() => flushLogs(), 10 * 60 * 1000);
            })
            .catch(console.error);

        return () => {
            flushLogs();
            if (periodicLoggingTimer.current) {
                clearInterval(periodicLoggingTimer.current);
            }
        };
    }, []);

    /**
     * Calculate the size of a log entry in bytes
     */
    const getLogSize = (logEntry: LogEntry): number => {
        return Buffer.byteLength(logEntry.message, 'utf8') + 26; // 26 bytes for timestamp
    };

    /**
     * Send logs to CloudWatch
     */
    const sendLogsToCloudWatch = async (
        logStreamName: string,
        logs: LogEntry[]
    ) => {
        try {
            const params = {
                logGroupName: LOG_GROUP_NAME,
                logStreamName,
                logEvents: logs.map(log => ({
                    message: log.message,
                    timestamp: log.timestamp
                })),
            };

            const command = new PutLogEventsCommand(params);
            await cwClient.current?.send(command);
        } catch (error) {
            console.error('Error sending logs to CloudWatch:', error);
        }
    };

    // Add a log entry to the batch
    const log = async (eventCode: string, message: string) => {
        console.log(message);
        const timestamp = Date.now();
        const logEntry: LogEntry = { message, timestamp };

        // Initialize batch if it doesn't exist
        if (!logBatches.current[eventCode]) {
            await createLogStream(eventCode);
            logBatches.current[eventCode] = [];
        }

        const batch = logBatches.current[eventCode];
        batch.push(logEntry);

        // Check if we need to flush based on size or count
        const currentBatchSize = batch.reduce((sum, entry) => sum + getLogSize(entry), 0);
        if (currentBatchSize >= MAX_BATCH_SIZE || batch.entries.length >= MAX_BATCH_COUNT) {
            await sendLogsToCloudWatch(
                eventCode,
                batch
            );
            logBatches.current[eventCode] = [];
        }
    };

    const createLogStream = async (logStreamName: string) => {
        try {
            const params = {
                logGroupName: LOG_GROUP_NAME,
                logStreamName,
            };

            await cwClient.current?.send(new CreateLogStreamCommand(params));
        } catch (error) {
            if ((error as Error).name != 'ResourceAlreadyExistsException') {
                console.error('Error creating log stream:', error);
            }
        }
    };

    /**
     * Flush all pending logs
     */
    const flushLogs = async () => {
        const promises = Object.entries(logBatches.current).map(([logStreamName, batch]) => {
            if (batch.length > 0) {
                return sendLogsToCloudWatch(
                    logStreamName,
                    batch
                ).then(() => logBatches.current[logStreamName] = []);
            }
        });

        await Promise.all(promises);
    };

    return (
        <CWLoggingContext.Provider value={{ log, flushLogs }}>
            {children}
        </CWLoggingContext.Provider>
    );
};

export const useCloudWatchLogging = () => {
    const context = useContext(CWLoggingContext);
    if (context === undefined) {
        throw new Error('useCloudWatchLogging must be used within a CWLoggingProvider');
    }
    return context;
};
