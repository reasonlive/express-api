import DataType from "../DataType.js";

export default class DataValidator {
    static validate(data, dataType) {
        if (dataType === DataType.TEMPERATURE) {
            return typeof data === 'number' && (data >= 0 && data <= 100)
                || typeof data === 'string'
                && (parseInt(data) >= 0 && parseInt(data) <= 100)
                || (data.split(',').every(elem => parseInt(elem) >= 0 && parseInt(elem) <= 100))
        }

        return false;
    }
}