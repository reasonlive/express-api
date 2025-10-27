'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { SensorData } from '@/types/sensor';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

export default function SensorDashboard() {
    const [sensorData, setSensorData] = useState<SensorData[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout|null>(null);

    const connectWebSocket = () => {
        try {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }

            console.log('Attempting to connect to WebSocket...');
            socketRef.current = io('http://localhost:5000', {
                timeout: 5000,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
            });

            socketRef.current.on('connect', () => {
                console.log('Connected to server');
                setIsConnected(true);
                setError(null);
            });

            socketRef.current.on('disconnect', (reason) => {
                console.log('Disconnected from server:', reason);
                setIsConnected(false);
                if (reason === 'io server disconnect') {
                    // Server intentionally disconnected, try to reconnect
                    socketRef.current?.connect();
                }
            });

            socketRef.current.on('connect_error', (error) => {
                console.error('Connection error:', error.message);
                setIsConnected(false);
                setError(`Ошибка подключения: ${error.message}`);

                // Автоматическая переподключение через 5 секунд
                clearTimeout(Number(reconnectTimeoutRef.current));
                reconnectTimeoutRef.current = setTimeout(() => {
                    console.log('Attempting to reconnect...');
                    connectWebSocket();
                }, 5000);
            });

            socketRef.current.on('sensorData', (newData: SensorData) => {
                setSensorData(prev => {
                    const updated = [...prev, newData];
                    return updated.slice(-50);
                });
                setError(null);
            });

        } catch (error) {
            console.error('WebSocket setup error:', error);
            setError('Ошибка инициализации подключения');
        }
    };

    const fetchHistoricalData = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await fetch('http://localhost:5000/api/sensors', {
                signal: AbortSignal.timeout(10000) // Таймаут 10 секунд
            });

            if (!response.ok) {
                console.error(`HTTP error! status: ${response.status}`);
                return;
            }

            const data = await response.json();
            setSensorData(data);
        } catch (error: any) {
            console.error('Error fetching historical data:', error);
            if (error.name === 'AbortError') {
                setError('Таймаут при загрузке исторических данных');
            } else {
                setError(`Ошибка загрузки данных: ${error.message}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const manualReconnect = () => {
        setError(null);
        setIsLoading(true);
        fetchHistoricalData();
        connectWebSocket();
    };

    useEffect(() => {
        fetchHistoricalData();
        connectWebSocket();

        return () => {
            // Cleanup
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
            clearTimeout(Number(reconnectTimeoutRef.current));
        };
    }, []);

    const chartOptions: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: 'Температура датчиков в реальном времени',
            },
        },
        scales: {
            y: {
                min: 0,
                max: 100,
                title: {
                    display: true,
                    text: 'Температура (°C)'
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Время'
                }
            }
        },
    };

    const chartData = {
        labels: sensorData.map(data =>
            new Date(data.created_at).toLocaleTimeString()
        ),
        datasets: [
            {
                label: 'Температура',
                data: sensorData.map(data => data.temperature),
                borderColor: isConnected ? 'rgb(75, 192, 192)' : 'rgb(255, 159, 64)',
                backgroundColor: isConnected ? 'rgba(75, 192, 192, 0.2)' : 'rgba(255, 159, 64, 0.2)',
                tension: 0.1,
                pointBackgroundColor: isConnected ? 'rgb(75, 192, 192)' : 'rgb(255, 159, 64)',
            },
        ],
    };

    const currentTemperature = sensorData.length > 0
        ? sensorData[sensorData.length - 1].temperature
        : null;

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1>Панель мониторинга датчиков</h1>

            {/* Статус подключения */}
            <div style={{
                marginBottom: '20px',
                padding: '10px',
                backgroundColor: isConnected ? '#d4edda' : '#fff3cd',
                border: `1px solid ${isConnected ? '#c3e6cb' : '#ffeaa7'}`,
                borderRadius: '5px',
                color: isConnected ? '#155724' : '#856404'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        Статус: {isConnected ? '✅ Подключено к серверу' : '⚠️ Соединение потеряно'}
                        {currentTemperature && (
                            <span style={{ marginLeft: '20px' }}>
                Текущая температура: <strong>{currentTemperature}°C</strong>
              </span>
                        )}
                    </div>
                    {!isConnected && (
                        <button
                            onClick={manualReconnect}
                            style={{
                                padding: '5px 10px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer'
                            }}
                        >
                            Переподключиться
                        </button>
                    )}
                </div>
            </div>

            {/* Блок ошибок */}
            {error && (
                <div style={{
                    marginBottom: '20px',
                    padding: '10px',
                    backgroundColor: '#f8d7da',
                    border: '1px solid #f5c6cb',
                    borderRadius: '5px',
                    color: '#721c24'
                }}>
                    ⚠️ {error}
                    {error.includes('подключения') && (
                        <div style={{ marginTop: '5px', fontSize: '0.9em' }}>
                            Автоматическая переподключение через 5 секунд...
                        </div>
                    )}
                </div>
            )}

            {/* Загрузка */}
            {isLoading && (
                <div style={{
                    marginBottom: '20px',
                    padding: '10px',
                    textAlign: 'center',
                    backgroundColor: '#e2f0fb',
                    border: '1px solid #b8daff',
                    borderRadius: '5px'
                }}>
                    Загрузка данных...
                </div>
            )}

            {/* График */}
            <div style={{ height: '500px', opacity: isLoading ? 0.7 : 1 }}>
                {sensorData.length > 0 ? (
                    <Line options={chartOptions} data={chartData} />
                ) : (
                    <div style={{
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f8f9fa',
                        border: '1px dashed #dee2e6',
                        borderRadius: '5px'
                    }}>
                        {isLoading ? 'Загрузка данных...' : 'Нет данных для отображения'}
                    </div>
                )}
            </div>

            {/* Таблица с данными */}
            <div style={{ marginTop: '20px' }}>
                <h3>Последние показания ({sensorData.length} записей):</h3>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {sensorData.length > 0 ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                            <tr style={{ backgroundColor: '#f8f9fa' }}>
                                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Время</th>
                                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Температура</th>
                            </tr>
                            </thead>
                            <tbody>
                            {[...sensorData].reverse().map((data) => (
                                <tr key={data.id}>
                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                        {new Date(data.created_at).toLocaleString()}
                                    </td>
                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                        {data.temperature}°C
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>
                            Нет данных для отображения
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}