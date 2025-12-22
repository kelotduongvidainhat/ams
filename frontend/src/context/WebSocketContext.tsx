import { createContext, useContext, useEffect, useState, type ReactNode, useRef } from 'react';

type WebSocketContextType = {
    isConnected: boolean;
    lastMessage: any;
};

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<any>(null);
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        // Connect to WS
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Assume backend is on same host port 3000 if dev, or configured URL
        const backendHost = window.location.hostname === 'localhost' ? 'localhost:3000' : window.location.host;
        const url = `${protocol}//${backendHost}/ws`;

        const connect = () => {
            console.log('🔌 Connecting to WebSocket...', url);
            ws.current = new WebSocket(url);

            ws.current.onopen = () => {
                console.log('✅ WebSocket Connected');
                setIsConnected(true);
            };

            ws.current.onclose = () => {
                console.log('❌ WebSocket Disconnected. Reconnecting...');
                setIsConnected(false);
                setTimeout(connect, 3000); // Reconnect after 3s
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📥 WS Message:', data);
                    setLastMessage(data);
                } catch (e) {
                    console.error('Failed to parse WS message', e);
                }
            };
        };

        connect();

        return () => {
            ws.current?.close();
        };
    }, []);

    return (
        <WebSocketContext.Provider value={{ isConnected, lastMessage }}>
            {children}
        </WebSocketContext.Provider>
    );
}

export function useWebSocket() {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
}
