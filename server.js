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
        // TODO: place this logic to other place
        await MessageBrokerService.consumeMessages(
            'sensor_data',
            async (data) => {
                // value must be a single integer less or equal than 100 and greater or equal 0
                if (DataValidator.validateTemperatureData(data)) {
                    // if broker data is a string of numbers separated by comma
                    if (typeof data === 'string' && data.split(',').length > 1) {
                        data = data.split(',');
                        let seconds = new Date().getSeconds();
                        const dates = [new Date()];

                        data.forEach((value, i) => {
                            if (i > 0) {
                                seconds = seconds + 5;
                                dates.push(new Date(new Date().setSeconds(seconds)))
                            }
                        })

                        await database.insert('sensor_data', {
                            temperature: data,
                            created_at: dates
                        })

                        const result = await database.select('sensor_data', dates.length);
                        result.reverse().forEach(record => {
                            WebsocketService.broadcastToClients('sensorData', record);
                        })
                    }
                    else {
                        const id = await database.insert('sensor_data', {temperature: data});
                        WebsocketService.broadcastToClients('sensorData', {
                            id,
                            temperature: data,
                            created_at: new Date()
                        });
                    }
                }
            }
        );
    }
})()