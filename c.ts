import fs from 'fs';
import path from 'path';
import Knex from 'knex';
import { decompress } from './src/helpers/zlib';

const dataPath = path.resolve(__dirname, 'data');

const main = async () => {
	const knex = Knex({
		client: 'sqlite3',
		connection: {
			filename: path.resolve(dataPath, '4483341.sqlite'),
		},
		useNullAsDefault: false,
	});

	const rows = await knex(`twitter_tweets`);

	for (const row of rows) {
		const x = await decompress<any>(row.data);
		fs.promises.appendFile('x.json', `${JSON.stringify(x, null, 2)}\n\n`);
	}

	await knex.destroy();
};

(async () => {
	try {
		await main();
	}
	catch (error) {
		console.log(error);
	}
})();
