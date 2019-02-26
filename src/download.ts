import fs from 'fs';
import path from 'path';
import url from 'url';

import request from 'request';
import Knex from 'knex';

import {
	TableName,
} from '~/constants';

import {
	Database,
} from '~/libs';

import {
	sleep,
	mkdir,
} from '~/helpers';

import accounts from './accounts';

async function downloadMedia(accountId: string, url_: string) {
	const dirPath = path.resolve(__path.root, 'download', accountId);
	await mkdir(dirPath);

	let name = url.parse(url_).pathname!;
	if(name.endsWith(':orig') === true) {
		name = name.substr(0, name.length - 5);
	}
	name = name.split('/').pop()!;

	const filePath = path.resolve(dirPath, name);

	return new Promise((resolve, reject) => {
		const stream = fs.createWriteStream(filePath);
		request(url_).on('error', reject).on('close', resolve).pipe(stream);
	});
}

async function download(accountId: string) {
	console.log(accountId);

	const knex = Knex({
		'client': 'sqlite3',
		'connection': {
			'filename': path.resolve(__path.root, 'fetch', `${accountId}.sqlite`),
		},
		'useNullAsDefault': true,
	});

	const rows = await knex(TableName.TWITTER_MEDIA).where({
		'downloaded': false,
	}) as Array<{
		id: string;
		tweet_id: string;
		url: string;
		downloaded: boolean;
		retry_count: number;
	}>;

	console.log(rows.length);

	for(const row of rows) {
		if(row.downloaded === true) {
			continue;
		}
		if(row.retry_count > 10) {
			continue;
		}

		await sleep(10);

		try {
			await downloadMedia(accountId, row.url);

			await sleep(10);

			await knex(TableName.TWITTER_MEDIA).where({
				'id': row.id,
			}).update({
				'downloaded': true,
			});
		}
		catch(error) {
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
	Database.createInstance();
	const database = Database.getInstance();
	await database.initialize();

	const accounts = await database.getAccounts();

	try {
		for(const account of accounts) {
			await sleep(10);

			await download(account.id);
		}
	}
	catch(error) {
		console.log(error);
	}

	await database.close();
})();
