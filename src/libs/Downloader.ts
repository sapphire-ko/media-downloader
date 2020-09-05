import fs from 'fs';
import path from 'path';
import url from 'url';
import https from 'https';
import assert from 'assert';
import { dataPath } from '~/constants';
import {
	mkdir,
	sleep,
} from '~/helpers';
import { Database } from '~/libs';

function parseURL(value: string) {
	return url.parse(value);
}

export class Downloader {
	private static instance: Downloader | null = null;

	private constructor() { }

	public static createInstance() {
		if (this.instance !== null) {
			throw new Error('cannot create instance');
		}
		this.instance = new Downloader();
	}

	public static getInstance() {
		if (this.instance === null) {
			throw new Error('instance is null');
		}
		return this.instance;
	}

	private async download(accountId: string, url: string) {
		await mkdir(`${dataPath}/${accountId}`);

		let name = parseURL(url).pathname!;
		if (name.endsWith(':orig') === true) {
			name = name.substr(0, name.length - 5);
		}
		name = name.split('/').pop()!;

		const filePath = path.resolve(dataPath, accountId, name);

		const size = await new Promise((resolve, reject) => {
			https.get(url, response => {
				if (response.statusCode !== 200) {
					return reject(new Error(`${response.statusCode}`));
				}
				const stream = fs.createWriteStream(filePath);
				response.pipe(stream);
				const size = parseInt(response.headers['content-length']!, 10);
				stream.on('finish', () => {
					resolve(size);
				});
			});
		});

		const stats = await fs.promises.lstat(filePath);

		assert(stats.size === size, `file did not downloaded properly ${stats.size} ${size} ${url}`);
	}

	public async downloadMedia() {
		const database = Database.getInstance();

		const media = await database.getMedia();

		for (const medium of media) {
			const {
				account_id,
				url,
				retry_count: retryCount,
			} = medium;

			try {
				await this.download(account_id, url);
				await database.updateMedium({
					url,
					account_id,
					'downloaded': true,
					'retryCount': retryCount,
				});
			}
			catch (error) {
				console.log(error);
				await database.updateMedium({
					url,
					account_id,
					'downloaded': false,
					'retryCount': retryCount + 1,
				});
			}

			await sleep(100);
		}
	}
}
