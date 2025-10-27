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
import DataType from "./app/DataType.js";
import DataTransformer from "./app/helpers/DataTransformer.js";
config()

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

app.use('/api', new ApiRouter());

WebsocketService.init(server);

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

(async () => {
    const database = DatabaseService.getInstance();
    await database.initializeTable('sensor_data');

    await server.listen(process.env.PORT);
    console.log('server started on port ' + process.env.PORT);

    // if application started for tests without message broker
    if (parseInt(process.env.FAKE_DATA_MODE)) {
       await DataFaker.simulateSensorData();
    }
    else {
        await MessageBrokerService.init();

        await MessageBrokerService.consumeMessages(
            'sensor_data',
            async (data) => {
                if (DataValidator.validate(data, DataType.TEMPERATURE)) {
                    const preparedData = DataTransformer.transform(data, DataType.TEMPERATURE);

                    if (preparedData.temperature?.length) {
                        await database.insert('sensor_data', preparedData);
                        const result = await database.select('sensor_data', preparedData.temperature.length);

                        result.reverse().forEach(record => {
                            WebsocketService.broadcastToClients('sensorData', record);
                        })
                    }
                    else {
                        const id = await database.insert('sensor_data', preparedData);
                        WebsocketService.broadcastToClients('sensorData', {id, ...preparedData});
                    }
                }
            }
        )
    }
})()