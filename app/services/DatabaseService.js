import mysql from "mysql2/promise";
import {config} from 'dotenv';
config()

export default class DatabaseService {
    static #instance;
    #connection;

    constructor() {
        this.#connection = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });
    }

    static getInstance() {
        if (DatabaseService.#instance === undefined) {
            DatabaseService.#instance = new this();
        }

        return DatabaseService.#instance;
    }

    /**
     *
     * @param {string} table - table name
     * @param {number} limit - amount of last records
     * @returns {Promise<array>}
     */
    async select(table, limit = 50) {
        const [rows] = await this.#connection.execute(`SELECT * FROM ${table} ORDER BY id DESC LIMIT ${limit}`)
        return rows;
    }

    /**
     *
     * @param {string} table - table name
     * @param {object} data
     * @returns {Promise<number>} - insertId
     */
    async insert(table, data) {
        if (!Object.keys(data).length) {
            return 0;
        }

        let query = '(';
        let marks = '(';
        let values = [];
        let isSingleRow = true;

        for (let key in data) {
            query += key + ',';

            if (Array.isArray(data[key])) {
                isSingleRow = false;
            }

            values.push(data[key])
        }

        query = query.slice(0, query.length - 1) + ')';

        if (isSingleRow) {
            marks += '?,'.repeat(values.length).slice(0, values.length) + ')';
        }
        else {
            marks = '';
            values.forEach(elem => {
                let tmp = '?,'.repeat(values.length);
                tmp = `(${tmp.slice(0, tmp.length - 1)})`;

                marks = (tmp + ',').repeat(elem.length);
            })

            const [numbers, dates] = values;
            values = [];
            numbers.forEach((num, i) => values.push([parseInt(num), dates[i]]));
            marks = marks.slice(0, marks.length - 1);
        }

        const r = await this.#connection
            .execute(`INSERT INTO ${table} ${query} VALUES ${marks}`, isSingleRow ? values : values.flat());

        return r?.insertId ?? 0; // is not single, last inserted id will be returned
    }

    /**
     * Table initialization
     * @param table
     * @returns {Promise<void>}
     */
    async initializeTable(table) {
        await this.#connection.execute(`CREATE TABLE IF NOT EXISTS ${table} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        temperature FLOAT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    }
}