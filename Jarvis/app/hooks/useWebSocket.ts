import { useEffect, useState } from 'react';

const useWebSocket = (url: string) => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [messages, setMessages] = useState<string[]>([]);

    useEffect(() => {
        const ws = new WebSocket(url);

        ws.onopen = () => console.log('Connected to WebSocket');
        ws.onmessage = (event) => {
            console.log('Message from server:', event.data);
            setMessages((prev) => [...prev, event.data]);
        };
        ws.onclose = () => console.log('WebSocket disconnected');
        ws.onerror = (error) => console.error('WebSocket error:', error);

        setSocket(ws);

        return () => ws.close();
    }, [url]);

    const sendMessage = (message: string) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(message);
        }
    };

    return { messages, sendMessage };
};

export default useWebSocket;
