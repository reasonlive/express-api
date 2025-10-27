import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import {config} from 'dotenv';
import ApiRouter from "./app/routes/ApiRouter.js";
import DataFaker from "./app/helpers/DataFaker.js";
import WebsocketService from "./app/services/WebsocketService.js";
import DatabaseService from "./app/services/DatabaseService.js";
import MessageBrokerService from "./app/services/MessageBrokerService.js";
import DataValidator from "./app/helpers/DataValidator.js";
config()

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());
app.use('/api', new ApiRouter());

WebsocketService.init(server);

(async () => {
    await DatabaseService.getInstance().initializeTable('sensor_data');
    await server.listen(process.env.PORT);
    console.log('server started on port ' + process.env.PORT);

    if (parseInt(process.env.FAKE_DATA_MODE)) {
       await DataFaker.simulateSensorData();
    }
    else {
        await MessageBrokerService.init();

        await MessageBrokerService.consumeMessages(
            'sensor_data',
            async (data) => {
                // value must be a single integer less or equal than 100 and greater or equal 0
                if (DataValidator.validateTemperatureData(data)) {
                    const id = await DatabaseService.getInstance().insert('sensor_data', {temperature: data});
                    WebsocketService.broadcastToClients('sensorData', {
                        id,
                        temperature: data,
                        created_at: new Date()
                    });
                }
            }
        );
    }
})()

// Обработка необработанных исключений
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});