export default class DataValidator {
    static validateTemperatureData(data) {
        return typeof data === 'string'
            && (parseInt(data) > 0 && parseInt(data) <= 100)
            || (data.split(',').every(elem => parseInt(elem) >= 0 && parseInt(elem) <= 100))
    }
}