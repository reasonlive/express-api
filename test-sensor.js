import amqp from 'amqplib';

async function sendSensorData() {
    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();

        const queue = 'sensor_data';
        await channel.assertQueue(queue, { durable: false });

        // Send 10 values
        console.log('Sending first batch of 10 values...');
        for (let i = 0; i < 10; i++) {
            const temperature = Math.floor(Math.random() * 101);
            const message = JSON.stringify({ temperature });

            channel.sendToQueue(queue, Buffer.from(message));
            console.log(`Sent: ${temperature}°C`);

            // Send to HTTP API as well
            await fetch('http://localhost:5000/api/sensors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: message
            });
        }

        // Wait 2 seconds and send next batch
        setTimeout(async () => {
            console.log('Sending second batch of 10 values...');
            for (let i = 0; i < 10; i++) {
                const temperature = Math.floor(Math.random() * 101);
                const message = JSON.stringify({ temperature });

                channel.sendToQueue(queue, Buffer.from(message));
                console.log(`Sent: ${temperature}°C`);

                await fetch('http://localhost:5000/api/sensors', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: message
                });
            }

            // Wait 2 seconds and send final batch
            setTimeout(async () => {
                console.log('Sending third batch of 10 values...');
                for (let i = 0; i < 10; i++) {
                    const temperature = Math.floor(Math.random() * 101);
                    const message = JSON.stringify({ temperature });

                    channel.sendToQueue(queue, Buffer.from(message));
                    console.log(`Sent: ${temperature}°C`);

                    await fetch('http://localhost:5000/api/sensors', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: message
                    });
                }

                console.log('All test data sent!');
                await channel.close();
                await connection.close();
            }, 2000);
        }, 2000);

    } catch (error) {
        console.error('Error:', error);
    }
}

sendSensorData();