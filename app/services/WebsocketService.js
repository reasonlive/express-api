import {Server} from "socket.io";
import {config} from "dotenv";
config()

export default class WebsocketService {
    static #connectedClients = new Set();
    static #websocket;

    constructor(server) {
        WebsocketService.#websocket = new Server(server, {
            cors: {
                origin: process.env.CORS_ORIGIN.split(','),
                methods: process.env.CORS_METHODS.split(',')
            }
        });

        WebsocketService.#websocket.on('connection', (socket) => {
            console.log('Client connected:', socket.id);
            WebsocketService.#connectedClients.add(socket);

            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
                WebsocketService.#connectedClients.delete(socket);
            });
        });
    }

    static init(server) {
        new this(server);
    }

    /**
     * Broadcast data to all connections
     * @param {string} event - event name
     * @param {object} data - any data
     */
    static broadcastToClients(event, data) {
        WebsocketService.#connectedClients.forEach(client => {
            client.emit(event, data);
        });
    }
}