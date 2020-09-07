import fs from 'fs';
import path from 'path';
import url from 'url';
import assert from 'assert';
import https from 'https';
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

interface Media {
	tweet_id: string;
	url: string;
	downloaded: boolean;
	retry_count: number;
}

function parseURL(value: string) {
	return url.parse(value);
}

async function downloadMedia(params: {
	downloadPath: string;
	accountId: string;
	tweetId: string;
	url: string;
}) {
	const {
		downloadPath,
		accountId,
		tweetId,
		url,
	} = params;

	const dirPath = path.resolve(downloadPath, accountId);
	await mkdir(dirPath);

	let name = parseURL(url).pathname!;
	if (name.endsWith(':orig') === true) {
		name = name.substr(0, name.length - 5);
	}
	name = name.split('/').pop()!;

	const filePath = path.resolve(dirPath, name);

	const size = await new Promise((resolve, reject) => {
		https.get(url, response => {
			if (response.statusCode !== 200) {
				const codes = [
					403,
					404,
					// 500,
				];
				if (!codes.includes(response.statusCode!)) {
					console.log(`response code: ${response.statusCode} ${accountId} ${tweetId} ${url}`);
				}
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

async function download(params: {
	index: number;
	downloadPath: string;
	accountId: string;
}) {
	const {
		index,
		downloadPath,
		accountId,
	} = params;

	const knex = Knex({
		'client': 'sqlite3',
		'connection': {
			'filename': path.resolve(dataPath, `${accountId}.sqlite`),
		},
		'useNullAsDefault': true,
	});

	const rows: Media[] = await knex(TableName.TWITTER_MEDIA)
		.where({
			downloaded: false,
		});

	if (rows.length > 0) {
		console.log(`[${index}] ${rows.length} ${accountId}`);
	}

	let totalCount = 0;
	let successCount = 0;
	let failureCount = 0;

	for (const row of rows) {
		if (row.downloaded === true) {
			continue;
		}
		if (row.retry_count > 10) {
			continue;
		}

		await sleep(10);

		try {
			await downloadMedia({
				downloadPath,
				accountId,
				tweetId: row.tweet_id,
				url: row.url,
			});

			await knex(TableName.TWITTER_MEDIA).where({
				url: row.url,
			}).update({
				'downloaded': true,
			});

			++successCount;
		}
		catch (error) {
			await knex(TableName.TWITTER_MEDIA).where({
				url: row.url,
			}).update({
				'retry_count': row.retry_count + 1,
			});

			++failureCount;
		}

		++totalCount;
	}

	console.log(`[${index}] ${successCount} ${failureCount} ${totalCount} ${rows.length} ${accountId}`);

	await knex.destroy();
}

(async () => {
	try {
		const downloadPath = path.resolve(rootPath, 'download');
		await mkdir(downloadPath);

		const aPath = path.resolve(downloadPath, `${Date.now()}`);

		await mkdir(aPath);

		const getFiles = async () => {
			const files = await fs.promises.readdir(dataPath);
			return files.filter(x => {
				if (!x.endsWith(`.sqlite`)) {
					return false;
				}
				if (x === 'media_downloader.sqlite') {
					return false;
				}
				if (x === 'ids.sqlite') {
					return false;
				}
				return true;
			});
		};
		const files = await getFiles();

		const PROMISE_COUNT = 5;

		const count = Object.fromEntries(
			Array.from({ length: PROMISE_COUNT }).map((_, i) => {
				return [i, 0];
			}),
		);
		const promises = Array.from({ length: PROMISE_COUNT }).map(async (_, i) => {
			do {
				const file = files.shift();

				if (typeof file !== 'string') {
					return;
				}

				await sleep(10);

				const id = file.split('.').shift()!;
				await download({
					index: i,
					downloadPath: aPath,
					accountId: id,
				});

				++count[i];
			}
			while (files.length > 0);
		});

		await Promise.all(promises);

		console.log(`count: ${JSON.stringify(count, null, 2)}`);
	}
	catch (error) {
		console.trace(error);
	}
})();
