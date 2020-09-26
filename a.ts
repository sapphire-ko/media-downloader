import fs from 'fs';
import path from 'path';
import Knex from 'knex';

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
	const promises = databases.map(async database => {
		const knex = Knex({
			client: 'sqlite3',
			connection: {
				filename: path.resolve(dataPath, database),
			},
			useNullAsDefault: false,
		});

		const rows = await knex(`twitter_media`).where('retry_count', '<=', 3).andWhere('downloaded', false);
		if (rows.length !== 0) {
			console.log('rows.length', database, rows.length);
		}

		await knex.destroy();

		return rows.length;
	});
	const values = await Promise.all(promises);
	const count = values.reduce((a, b) => a + b, 0);
	console.log('count', count);
};

(async () => {
	try {
		await main();
	}
	catch (error) {
		console.log(error);
	}
})();
