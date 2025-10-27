/**
 * Creates constants as a class instances
 */
export default class DataType {
    #id;
    get [Symbol.toStringTag]() {
        return this.#id;
    }

    constructor(id) {
        if (!id) {
            throw new Error('DataType class need identifier');
        }

        this.#id = id;
        Object.setPrototypeOf(this, DataType);
    }

    static TEMPERATURE = new DataType('TEMPERATURE');
}