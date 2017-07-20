import {Proxy} from 'eaptain-proxy'
import {ClientOpts} from 'redis'
import * as koaBodyParser from 'koa-bodyparser'
import * as path from 'path';
import * as fs from 'fs'
import {getPort} from 'eaptain-getport'

export class Server {

    proxy: Proxy;

    rootPath: string = process.cwd();

    constructor(serviceName: string, options: ClientOpts) {
        this.proxy = new Proxy(serviceName, options);
        this.proxy.use(koaBodyParser());
        this.loadMiddleware().catch(console.error);
        this.loadRouter().catch(console.error);
    }

    async loadRouter() {
        const files = await this.walk(path.join(this.rootPath, 'routers'));
        files.forEach((item) => {
            const m = require(item);
            this.proxy.use(m && m.default ? m.default : m);
        })
    }

    async loadMiddleware() {
        const files = await this.walk(path.join(this.rootPath, 'middlewares'));
        files.forEach((item) => {
            this.proxy.use(require(item));
        })
    }

    async walk(input: string): Promise<string[]> {

        if (!await isExist(input)) {
            return [];
        }

        const files = await readDir(input);

        let result: string[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const tempPath = path.join(input, file);
            const stats = await getStats(tempPath);
            if (stats.isDirectory()) {
                result = result.concat(await this.walk(tempPath));
            } else {
                result.push(tempPath)
            }
        }

        return result;

        function isExist(input: string): Promise<boolean> {
            return new Promise<boolean>((resolve, reject) => {
                fs.exists(input, (value) => {
                    return resolve(value)
                });
            });
        }

        function readDir(input: string): Promise<string[]> {
            return new Promise((resolve, reject) => {
                fs.readdir(input, (err, dirs) => {
                    if (err) return reject(err);
                    return resolve(dirs);
                })
            });
        }

        function getStats(input: string): Promise<fs.Stats> {
            return new Promise((resolve, reject) => {
                fs.stat(input, (err, stat) => {
                    if (err) return reject(err);
                    return resolve(stat);
                })
            });
        }

    }

    async listen(port: number, host: string = '0.0.0.0') {
        port = await getPort(port, host);
        this.proxy.listen(port, host);
        console.log(`listen at : ${host}:${port}`);
    }
}