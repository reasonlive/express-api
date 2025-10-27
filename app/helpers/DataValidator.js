export default class DataValidator {
    static validateTemperatureData(data) {
        return typeof data === 'object' && data.temperature;
    }
}