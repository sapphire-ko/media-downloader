import path from 'path';
import url from 'url';
import { dataPath } from '~/constants';
import {
	download,
	log,
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

	private async download(params: {
		accountId: string;
		tweetId: string;
		url: string;
	}) {

		log('info', 'downloader', 'download');
		const {
			accountId,
			tweetId,
			url,
		} = params;

		await mkdir(`${dataPath}/${accountId}`);

		let name = parseURL(url).pathname!;
		if (name.endsWith(':orig') === true) {
			name = name.substr(0, name.length - 5);
		}
		name = name.split('/').pop()!;

		const filePath = path.resolve(dataPath, accountId, name);

		await download(url, filePath);
	}

	public async downloadMedia() {

		log('info', 'downloader', 'downloadMedia');
		const database = Database.getInstance();

		const media = await database.getMedia();

		for (const medium of media) {
			const {
				account_id,
				tweet_id,
				url,
				retry_count: retryCount,
			} = medium;

			try {
				await this.download({
					accountId: account_id,
					tweetId: tweet_id,
					url,
				});
				await database.updateMedium({
					url,
					account_id,
					'downloaded': true,
					'retryCount': retryCount,
				});
			}
			catch (error) {
				log('error', error.message, account_id, tweet_id, url);

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
