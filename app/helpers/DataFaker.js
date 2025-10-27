import DatabaseService from "../services/DatabaseService.js";
import WebsocketService from "../services/WebsocketService.js";

export default class DataFaker {
    static async simulateSensorData() {
        setInterval(async () => {
            const temperature = Math.floor(Math.random() * 101); // 0-100
            try {
                const id = await DatabaseService.getInstance().insert('sensor_data', {temperature})
                WebsocketService.broadcastToClients('sensorData', {
                    id,
                    temperature,
                    created_at: new Date()
                })

                console.log(`Simulated sensor data: ${temperature}°C`);
            } catch (error) {
                console.error('Error simulating sensor data:', error);
            }
        }, 5000); // Every 5 seconds
    }
}