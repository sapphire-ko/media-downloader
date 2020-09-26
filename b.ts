import fs from 'fs';
import path from 'path';
import Knex from 'knex';
import { compress } from './src/helpers/zlib';

const dataPath = path.resolve(__dirname, 'data');

const main = async () => {
	const getDatabases = async () => {
		const databases = await fs.promises.readdir(dataPath);
		return databases.filter(x => {
			if (!x.endsWith('.sqlite')) {
				return false;
			}
			if (x === 'ids.sqlite') {
				return false;
			}
			if (x === 'media_downloader.sqlite') {
				return false;
			}
			return true;
		}).sort((a, b) => {
			if (a.length === b.length) {
				return a.localeCompare(b);
			}
			return a.length - b.length;
		});
	};
	const databases = await getDatabases();

	for (const database of databases) {
		console.log('database', database);

		const knex = Knex({
			client: 'sqlite3',
			connection: {
				filename: path.resolve(dataPath, database),
			},
			useNullAsDefault: false,
		});

		await knex.schema.alterTable(`twitter_tweets`, table => {
			table.dropUnique(['id']);
		});
		await knex.schema.renameTable(`twitter_tweets`, `twitter_tweets_2`);

		await knex.schema.createTable(`twitter_tweets`, table => {
			table.string('id').primary().notNullable();
			table.binary('data').notNullable();
			table.timestamps(true, true);
		});

		const rows = await knex(`twitter_tweets_2`);
		console.log('rows.length', rows.length);
		let count = 0;
		for (const row of rows) {
			++count;
			if (count % 100 === 0) {
				console.log('count', count);
			}
			await knex(`twitter_tweets`).insert({
				id: row.id,
				data: await compress(JSON.parse(row.data)),
			});
		}

		await knex.schema.dropTable(`twitter_tweets_2`);

		await knex.raw('vacuum');

		await knex.destroy();
	}
};

(async () => {
	try {
		await main();
	}
	catch (error) {
		console.log(error);
	}
})();
