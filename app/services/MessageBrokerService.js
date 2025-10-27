import amqp from 'amqplib';
import { config } from 'dotenv';
config();

export default class MessageBrokerService {
    static #connection;
    static #channel;
    static #isConnected = false;

    static async init() {
        try {
            MessageBrokerService.#connection = await amqp.connect({
                protocol: 'amqp',
                hostname: process.env.RABBIT_MQ_HOST || 'localhost',
                port: process.env.RABBIT_MQ_PORT || 5672,
                username: process.env.RABBIT_MQ_USER || 'guest',
                password: process.env.RABBIT_MQ_PASS || 'guest'
            });

            console.log('Connected to RabbitMQ');

            // Обработка ошибок подключения
            MessageBrokerService.#connection.on('error', (error) => {
                console.error('RabbitMQ connection error:', error);
                MessageBrokerService.#isConnected = false;
            });

            MessageBrokerService.#connection.on('close', () => {
                console.log('RabbitMQ connection closed');
                MessageBrokerService.#isConnected = false;
            });

            MessageBrokerService.#isConnected = true;

        } catch (error) {
            console.error('Failed to connect to RabbitMQ:', error.message);
            MessageBrokerService.#isConnected = false;
            throw error;
        }
    }

    /**
     * Create channel with particular queue
     * @param {string} queue - queue name
     * @returns {Promise<Channel>}
     */
    static async createChannel(queue) {
        if (!MessageBrokerService.#isConnected) {
            throw new Error('Not connected to RabbitMQ');
        }

        try {
            MessageBrokerService.#channel = await MessageBrokerService.#connection.createChannel();
            await MessageBrokerService.#channel.assertQueue(queue, { durable: false });
            console.log('Queue asserted:', queue);

            return MessageBrokerService.#channel;
        } catch (error) {
            console.error('Error creating channel:', error);
            throw error;
        }
    }

    /**
     * Listen to queue channel to receive any messages
     * @param {string} queue
     * @param {Function} callback
     * @returns {Promise<void>}
     */
    static async consumeMessages(queue, callback) {
        try {
            if (!MessageBrokerService.#channel) {
                await MessageBrokerService.createChannel(queue);
            }

            console.log('Starting RabbitMQ consumer for queue:', queue);

            // Потребление сообщений из очереди
            MessageBrokerService.#channel.consume(queue, async (message) => {
                if (message !== null) {
                    try {
                        let data;
                        const content = message.content.toString();
                        if (
                            message.properties.contentType === 'application/json'
                            || message.properties.headers['Content-Type'] === 'application/json'
                        ) {
                            try {
                                data = JSON.parse(content);
                            }
                            catch (err) {
                                console.log(err.message);
                                return;
                            }
                        }
                        else {
                            data = content;
                        }

                        console.log('Received from RabbitMQ: ' + data);

                        // Выполняем callback
                        await callback(data);

                        // Подтверждаем получение сообщения после успешной обработки
                        MessageBrokerService.#channel.ack(message);
                    } catch (error) {
                        console.error('Error processing message:', error);
                        // Отклоняем сообщение при ошибке (без возврата в очередь)
                        MessageBrokerService.#channel.nack(message, false, false);
                    }
                }
            }, {
                noAck: false // Ручное подтверждение сообщений
            });

            console.log('RabbitMQ consumer started successfully');

        } catch (error) {
            console.error('Error starting RabbitMQ consumer:', error);
            // Перезапуск через 5 секунд при ошибке
            setTimeout(() => {
                MessageBrokerService.consumeMessages(queue, callback);
            }, 5000);
        }
    }

    /**
     * Close connections
     */
    static async close() {
        try {
            if (MessageBrokerService.#channel) {
                await MessageBrokerService.#channel.close();
            }
            if (MessageBrokerService.#connection) {
                await MessageBrokerService.#connection.close();
            }
            console.log('RabbitMQ connections closed');
        } catch (error) {
            console.error('Error closing RabbitMQ connections:', error);
        }
    }

    /**
     * Check if connected to RabbitMQ
     */
    static isConnected() {
        return MessageBrokerService.#isConnected;
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await MessageBrokerService.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Terminating...');
    await MessageBrokerService.close();
    process.exit(0);
});