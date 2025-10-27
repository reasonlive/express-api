import {Router} from "express";
import DatabaseService from "../services/DatabaseService.js";
import WebsocketService from "../services/WebsocketService.js";

export default class ApiRouter extends Router {
    constructor() {
        super();

        this.get('/sensors', async (req, res) => {
            try {
                res.json((await DatabaseService.getInstance().select('sensor_data')).reverse());
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.post('/sensors', async (req, res) => {
            try {
                const { temperature } = req.body;

                if (temperature === undefined || temperature < 0 || temperature > 100) {
                    return res.status(400).json({ error: 'Temperature must be between 0 and 100' });
                }

                const id = await DatabaseService.getInstance().insert('sensor_data', {temperature});

                // Send to all via websocket
                WebsocketService.broadcastToClients('sensorData', {
                    id,
                    temperature,
                    created_at: new Date()
                })

                res.json({ success: true, id });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }
}