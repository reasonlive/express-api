import DataType from "../DataType.js";

export default class DataTransformer {
    /**
     *
     * @param {*} data
     * @param {DataType} dataType
     * @returns {*|null}
     */
    static transform(data, dataType) {
        switch (dataType) {
            case DataType.TEMPERATURE:
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

                    return {
                        temperature: data,
                        created_at: dates
                    }
                }
                else if (!isNaN(parseInt(data))) {
                    return {
                        temperature: data,
                        created_at: new Date()
                    }
                }
                else if (typeof data === 'object') {
                    return {
                        temperature: data?.temperature || 0,
                        created_at: data?.created_at || new Date()
                    }
                }
                break;
            default:
                return null;
        }
    }
}