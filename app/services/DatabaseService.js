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
     * @returns {Promise<array>}
     */
    async select(table) {
        const [rows] = await this.#connection.execute(`SELECT * FROM ${table} ORDER BY created_at DESC LIMIT 50`)
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
                if (Array.isArray(elem)) {
                    elem.forEach(e => {
                        marks += `(?),`;
                    })
                }
            })

            marks = marks.slice(0, marks.length - 1);
        }

        const r = await this.#connection
            .execute(`INSERT INTO ${table} ${query} VALUES ${marks}`, isSingleRow ? values : values[0]);

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