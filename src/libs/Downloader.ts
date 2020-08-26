import fs from 'fs';
import path from 'path';
import url from 'url';
import assert from 'assert';
import request from 'request';
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

		const size = await new Promise<number>((resolve, reject) => {
			let size = 0;
			const stream = fs.createWriteStream(filePath);
			request(url).on('response', response => {
				size = parseInt(response.headers['content-length']!, 10);
			}).on('close', () => {
				resolve(size);
			}).on('error', reject).pipe(stream);
		});

		const stats = await fs.promises.lstat(filePath);

		assert(stats.size === size, 'file did not downloaded properly');
	}

	public async downloadMedia() {
		const database = Database.getInstance();

		const media = await database.getMedia();

		for (const medium of media) {
			const {
				id,
				account_id: accountId,
				url,
				retry_count: retryCount,
			} = medium;

			try {
				await this.download(accountId, url);
				await database.updateMedium({
					'id': id,
					'downloaded': true,
					'retryCount': retryCount,
				});
			}
			catch (error) {
				console.log(error);
				await database.updateMedium({
					'id': id,
					'downloaded': false,
					'retryCount': retryCount + 1,
				});
			}

			await sleep(100);
		}
	}
}
