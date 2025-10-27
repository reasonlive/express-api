export default class DataValidator {
    static validateTemperatureData(data) {
        return typeof data === 'number' && (data > 0 && data <= 100)
            || typeof data === 'string' && (parseInt(data) > 0 && parseInt(data) <= 100)
            || (Array.isArray(data) && data.split(',').every(elem => parseInt(elem) >= 0 && parseInt(elem) <= 100))
    }
}