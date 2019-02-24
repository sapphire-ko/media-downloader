import fs from 'fs';
import path from 'path';
import url from 'url';

import request from 'request';

import {
	Database,
} from '~/libs';

import {
	mkdir,
	sleep,
} from '~/helpers';

export class Downloader {
	private static instance: Downloader | null = null;

	private constructor() {}

	public static createInstance() {
		if(this.instance !== null) {
			throw new Error('cannot create instance');
		}
		this.instance = new Downloader();
	}

	public static getInstance() {
		if(this.instance === null) {
			throw new Error('instance is null');
		}
		return this.instance;
	}

	private async checkFile(accountId: string, name: string): Promise<boolean> {
		const targetPath = path.join(__path.data, accountId, name);

		try {
			await fs.promises.lstat(targetPath);
			return true;
		}
		catch(error) {
			switch(error.code) {
				case 'ENOENT': {
					return false;
				}
				default: {
					throw error;
				}
			}
		}
	}

	private async download(accountId: string, url_: string) {
		await mkdir(`${__path.data}/${accountId}`);

		let name = url.parse(url_).pathname!;
		if(name.endsWith(':orig') === true) {
			name = name.substr(0, name.length - 5);
		}
		name = name.split('/').pop()!;

		const filePath = path.resolve(__path.data, accountId, name);

		const exists = await this.checkFile(accountId, name);
		if(exists === false) {
			return new Promise((resolve, reject) => {
				const stream = fs.createWriteStream(filePath);
				request(url_).on('error', reject).on('close', resolve).pipe(stream);
			});
		}
	}

	public async downloadMedia() {
		const database = Database.getInstance();

		const media = await database.getMedia();

		for(const medium of media) {
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
			catch(error) {
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
