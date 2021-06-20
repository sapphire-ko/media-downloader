import fs from 'fs';
import path from 'path';
import Knex from 'knex';
import { TableName } from './constants';
import { exists } from './helpers';

const rootPath = path.resolve(__dirname, '..');
const dataPath = path.resolve(rootPath, 'data');

const main = async () => {
    const twitterId = process.argv[2];

    const dbPath = path.resolve(dataPath, `${twitterId}.sqlite`);
    if (!await exists(dbPath)) {
        throw new Error(`${dbPath} does not exist`);
    }

    const knex = Knex({
        client: 'sqlite3',
        connection: {
            filename: path.resolve(dataPath, `${twitterId}.sqlite`),
        },
        useNullAsDefault: true,
    });

    const rows = await knex(TableName.TWITTER_ACCOUNTS);

    if (rows.length !== 1) {
        const rows = await knex(TableName.TWITTER_TWEETS).limit(1);
        console.log(rows[0]);
        throw new Error(`invalid row length: ${rows.length}`);
    }

    const data = JSON.parse(rows[0].data);
    const values = {
        'twitter id': rows[0].id,
        'screen_name': rows[0].screen_name,
        'name': data.name,
    };
    console.log(JSON.stringify(values, null, 2));
    await fs.promises.writeFile('artist.txt', JSON.stringify(values, null, 2));

    await knex.destroy();
};
main();