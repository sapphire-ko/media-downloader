import fs from 'fs';
import path from 'path';
import url from 'url';
import Knex from 'knex';
import {
	dataPath,
	rootPath,
	TableName,
} from '~/constants';
import {
	download,
	log,
	mkdir,
	sleep,
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

async function process(params: {
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
		client: 'sqlite3',
		connection: {
			filename: path.resolve(dataPath, `${accountId}.sqlite`),
		},
		useNullAsDefault: true,
	});

	const RETRY_COUNT = 2;

	const getRows = async () => {
		try {
			const rows: Media[] = await knex(TableName.TWITTER_MEDIA)
				.where('downloaded', false)
				.andWhere('retry_count', '<=', RETRY_COUNT);
			return rows;
		}
		catch (error) {
			log(accountId, error);
			return [];
		}
	};
	const rows = await getRows();

	log(`[${index}]`, rows.length, accountId);

	let totalCount = 0;
	let successCount = 0;
	let failureCount = 0;

	const LIMIT = Infinity;

	rows.splice(LIMIT);

	for (const row of rows) {
		const {
			url,
			downloaded,
			retry_count,
		} = row;

		if (downloaded === true) {
			continue;
		}
		if (retry_count > RETRY_COUNT) {
			continue;
		}
		if (rows.length > LIMIT) {
			break;
		}

		await sleep(Math.ceil(100 * (1 + Math.random())));

		try {
			const getFilePath = async (url: string) => {
				const dirPath = path.resolve(downloadPath, accountId);
				await mkdir(dirPath);

				let name = parseURL(url).pathname!;
				if (name.endsWith(':orig')) {
					name = name.substr(0, name.length - 5);
				}
				name = name.split('/').pop()!;

				return path.resolve(dirPath, name);
			};
			const filePath = await getFilePath(url);

			await download(url, filePath);

			await knex(TableName.TWITTER_MEDIA)
				.where({ url })
				.update({ downloaded: true });

			++successCount;
		}
		catch (error) {
			log(`[${index}]`, error.message, accountId, row.tweet_id, row.url);

			await knex(TableName.TWITTER_MEDIA)
				.where({ url })
				.update({ retry_count: row.retry_count + 1 });

			++failureCount;
		}

		++totalCount;
	}

	if (rows.length > 0) {
		log(`[${index}]`, successCount, failureCount, totalCount, rows.length, accountId);
	}

	await knex.destroy();

	return successCount;
}

(async () => {
	try {
		const downloadPath = path.resolve(rootPath, 'download');
		await mkdir(downloadPath);

		const aPath = path.resolve(downloadPath, `${Date.now()}`);

		await mkdir(aPath);

		const getFilenames = async () => {
			const files = await fs.promises.readdir(dataPath);
			return files.filter(x => {
				if (!x.endsWith(`.sqlite`)) {
					return false;
				}
				const filterList = [
					'media_downloader.sqlite',
					'ids.sqlite',
				];
				return !filterList.includes(x);
			});
		};
		const filenames = await getFilenames();

		const PROMISE_COUNT = 5;

		let count = 0;
		const promises = Array.from({ length: PROMISE_COUNT }).map(async (_, i) => {
			do {
				const filename = filenames.shift();

				if (typeof filename !== 'string') {
					return;
				}

				await sleep(10);

				const id = filename.split('.').shift()!;
				const x = await process({
					index: i,
					downloadPath: aPath,
					accountId: id,
				});
				count += x;
			}
			while (filenames.length > 0);

			log(`[${i}]`, `done`);
		});
		await Promise.all(promises);

		log(`count`, count);
	}
	catch (error) {
		console.trace(error);
	}
})();
