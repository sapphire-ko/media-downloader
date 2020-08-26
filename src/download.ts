import fs from 'fs';
import path from 'path';
import url from 'url';
import assert from 'assert';
import request from 'request';
import Knex from 'knex';
import {
	dataPath,
	rootPath,
	TableName,
} from '~/constants';
import {
	sleep,
	mkdir,
} from '~/helpers';

function parseURL(value: string) {
	return url.parse(value);
}

async function downloadMedia(downloadPath: string, accountId: string, url: string) {
	const dirPath = path.resolve(downloadPath, accountId);
	await mkdir(dirPath);

	let name = parseURL(url).pathname!;
	if (name.endsWith(':orig') === true) {
		name = name.substr(0, name.length - 5);
	}
	name = name.split('/').pop()!;

	const filePath = path.resolve(dirPath, name);

	const size = await new Promise<number>((resolve, reject) => {
		const stream = fs.createWriteStream(filePath);
		let size = 0;
		request(url).on('response', response => {
			size = parseInt(response.headers['content-length']!, 10);
		}).on('error', reject).on('close', () => {
			resolve(size);
		}).pipe(stream);
	});

	const stats = await fs.promises.lstat(filePath);
	assert(stats.size === size, 'file did not downloaded properly');
}

async function download(pathName: string, accountId: string) {
	const knex = Knex({
		'client': 'sqlite3',
		'connection': {
			'filename': path.resolve(dataPath, `${accountId}.sqlite`),
		},
		'useNullAsDefault': true,
	});

	const rows = await knex(TableName.TWITTER_MEDIA).where({
		'downloaded': false,
	}) as {
		id: string;
		tweet_id: string;
		url: string;
		downloaded: boolean;
		retry_count: number;
	}[];

	if (rows.length > 0) {
		console.log(`${rows.length} ${accountId}`);
	}

	for (const row of rows) {
		if (row.downloaded === true) {
			continue;
		}
		if (row.retry_count > 10) {
			continue;
		}

		await sleep(10);

		try {
			await downloadMedia(pathName, accountId, row.url);

			await sleep(10);

			await knex(TableName.TWITTER_MEDIA).where({
				'id': row.id,
			}).update({
				'downloaded': true,
			});
		}
		catch (error) {
			await sleep(10);

			await knex(TableName.TWITTER_MEDIA).where({
				'id': row.id,
			}).update({
				'retry_count': row.retry_count + 1,
			});
		}
	}

	await knex.destroy();
}

(async () => {
	try {
		const downloadPath = path.resolve(rootPath, 'download');
		await mkdir(downloadPath);

		const aPath = path.resolve(downloadPath, `${Date.now()}`);

		await mkdir(aPath);

		const files = (await fs.promises.readdir(dataPath)).filter(e => e.endsWith('.sqlite')).filter(e => {
			switch (e) {
				case 'media_downloader.sqlite':
				case 'ids.sqlite': {
					return false;
				}
				default: {
					return true;
				}
			}
		});

		let count = 0;
		const promises = Array.from(Array(5)).map(async () => {
			do {
				const file = files.shift();

				if (typeof file !== 'string') {
					return;
				}

				await sleep(10);

				const id = file.split('.').shift()!;
				await download(aPath, id);

				++count;
			}
			while (files.length > 0);
		});

		await Promise.all(promises);

		console.log(`count: ${count} / ${files.length}`);
	}
	catch (error) {
		console.trace(error);
	}
})();
