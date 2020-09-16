import path from 'path';
import Knex from 'knex';
import {
	dataPath,
	TableName,
} from './constants';
import {
	RequestType,
	RateLimitStatus,
	AccountTwitter,
	Tweet,
	TwitterMediumType,
} from './models';
import {
	Authentication,
	Twitter,
} from './libs';
import {
	log,
	sleep,
	sendRequest,
} from './helpers';

interface Medium {
	tweet_id: string;
	url: string;
	downloaded: boolean;
	retry_count: number;
}

async function fetch(id: string) {
	const knex = Knex({
		'client': 'sqlite3',
		'connection': {
			'filename': path.resolve(dataPath, `${id}.sqlite`),
		},
		'useNullAsDefault': true,
	});

	{
		const exists = await knex.schema.hasTable(TableName.TWITTER_ACCOUNTS);
		if (exists === false) {
			await knex.schema.createTable(TableName.TWITTER_ACCOUNTS, table => {
				table.string('id').primary().unique().notNullable();
				table.string('screen_name').notNullable();
				table.text('data').notNullable();
				table.boolean('is_fetched').notNullable();
				table.timestamps(true, true);
			});
		}
	}
	{
		const exists = await knex.schema.hasTable(TableName.TWITTER_TWEETS);
		if (exists === false) {
			await knex.schema.createTable(TableName.TWITTER_TWEETS, table => {
				table.string('id').primary().unique().notNullable();
				table.text('data').notNullable();
				table.timestamps(true, true);
			});
		}
	}
	{
		const exists = await knex.schema.hasTable(TableName.TWITTER_MEDIA);
		if (exists === false) {
			await knex.schema.createTable(TableName.TWITTER_MEDIA, table => {
				table.string('tweet_id').notNullable();
				table.string('url').notNullable();
				table.boolean('downloaded').notNullable();
				table.integer('retry_count').notNullable();
			});
		}
	}

	{
		const rows = await knex(TableName.TWITTER_ACCOUNTS).limit(1);
		if (rows.length === 0) {
			try {
				const data = await sendRequest({
					'type': RequestType.TWITTER_USER,
					'params': {
						'user_id': id,
					},
				}) as AccountTwitter;

				await knex(TableName.TWITTER_ACCOUNTS).insert({
					'id': id,
					'screen_name': data.screen_name,
					'data': JSON.stringify(data),
					'is_fetched': false,
				});
			}
			catch (error) {
				console.log(error);
				await knex.destroy();
				return;
			}
		}
	}

	const rows = await knex(TableName.TWITTER_ACCOUNTS).limit(1);
	const {
		screen_name: screenName,
		is_fetched,
	} = rows[0];

	const isFetched = is_fetched === 1;
	// const isFetched = 0 !== 0;

	try {
		await sleep(100);

		let maxId = '';
		let shouldSkip = false;

		if (isFetched === false) {
			const rows = await knex(TableName.TWITTER_TWEETS).select('id').orderByRaw('length(id)').limit(1);
			if (rows.length > 0) {
				maxId = rows[0].id;
			}
		}

		do {
			await sleep(100);

			const data = await sendRequest({
				'type': RequestType.TWITTER_SEARCH_UNIVERSAL,
				'params': {
					'screen_name': screenName,
					'max_id': maxId,
				},
			}) as { modules: { status: { data: Tweet; }; }[]; };

			const tweets: Tweet[] = [];
			for (const module of data.modules) {
				if (module.status === undefined) {
					continue;
				}
				tweets.push(module.status.data);
			}

			log(`tweets.length`, tweets.length);

			for (const tweet of tweets) {
				await sleep(5);

				const rows = await knex(TableName.TWITTER_TWEETS).where({
					'id': tweet.id_str,
				});

				if (rows.length > 0) {
					if (isFetched === true) {
						shouldSkip = true;
						continue;
					}
				}
				else {
					await knex(TableName.TWITTER_TWEETS).insert({
						'id': tweet.id_str,
						'data': JSON.stringify(tweet),
					});
				}

				if (tweet.retweeted_status !== undefined) {
					continue;
				}
				if (tweet.extended_entities === undefined) {
					continue;
				}

				const {
					extended_entities: entities,
				} = tweet;

				const media = entities.media.map((medium): Medium | null => {
					const getUrl = () => {
						switch (medium.type) {
							case TwitterMediumType.PHOTO: {
								return `${medium.media_url_https}:orig`;
							}
							case TwitterMediumType.VIDEO: {
								return medium.video_info.variants.filter(e => {
									return e.content_type.startsWith('video');
								}).sort((a, b) => {
									return b.bitrate - a.bitrate;
								})[0].url;
							}
							default: {
								return null;
							}
						}
					}
					const url = getUrl();

					if (url === null) {
						return null;
					}

					return {
						'tweet_id': tweet.id_str,
						'url': url,
						'downloaded': false,
						'retry_count': 0,
					};
				}).filter((x): x is Medium => x !== null);

				for (const medium of media) {
					const rows = await knex(TableName.TWITTER_MEDIA).where({
						'url': medium.url,
					});

					if (rows.length > 0) {
						continue;
					}

					await knex(TableName.TWITTER_MEDIA).insert(medium);

					await sleep(10);
				}
			}

			if (tweets.length > 1) {
				maxId = tweets[tweets.length - 1].id_str;
			}
			else {
				if (isFetched === false) {
					await knex(TableName.TWITTER_ACCOUNTS).where({
						'id': id,
					}).update({
						'is_fetched': true,
					});
				}
				break;
			}
		}
		while (shouldSkip === false);
	}
	catch (error) {
		console.log(error);
	}

	await knex.destroy();
}

function ids1(users: AccountTwitter[]) {
	const ids: string[] = [];
	let skip = false;
	for (const user of users) {
		if (user.screen_name === 'riku_chin') {
			skip = true;
		}
		if (skip) { continue; }
		ids.push(user.id_str);
	}
	return ids;
}
function ids2(users: AccountTwitter[]) {
	const ids: string[] = [];
	let skip = true;
	for (const user of users) {
		if (user.screen_name === 'riku_chin') {
			skip = false;
		}
		if (skip) { continue; }
		ids.push(user.id_str);
	}
	return ids;
}
function ids3(data: { ids: string[] }) {
	const ids: string[] = [];
	let skip = false;
	for (const x of data.ids) {
		if (x === '518486749') {
			skip = true;
		}
		if (skip) { continue; }
		ids.push(x);
	}
	return ids;
}
function ids4(data: { ids: string[] }) {
	const ids: string[] = [];
	let skip = true;
	for (const x of data.ids) {
		if (x === '518486749') {
			skip = false;
		}
		if (skip) { continue; }
		ids.push(x);
	}
	return ids;
}

function ids5(data: { ids: string[] }) {
	return data.ids.filter(x => parseInt(x[x.length - 2], 10) % 2 === 0);
}
function ids6(data: { ids: string[] }) {
	return data.ids.filter(x => parseInt(x[x.length - 2], 10) % 2 === 1);
}

(async () => {
	try {
		log();

		Twitter.createInstance();

		Authentication.createInstance();
		const auth = Authentication.getInstance();
		await auth.initialize();

		const status = await sendRequest({
			'type': RequestType.TWITTER_RATE_LIMIT_STATUS,
		}) as RateLimitStatus;
		log(status.resources.friends['/friends/list']);
		log(status.resources.search['/search/universal']);

		// let users: AccountTwitter[] = [];
		// let cursor = '';
		// do {
		// 	const data: {
		// 		users: AccountTwitter[];
		// 		next_cursor_str: string;
		// 		previous_cursor_str: string;
		// 	} = await sendRequest({
		// 		type: RequestType.TWITTER_FOLLOWING_LIST,
		// 		params: {
		// 			cursor,
		// 			skip_status: true,
		// 			include_user_entities: false,
		// 		},
		// 	});
		// 	users = users.concat(data.users);
		// 	cursor = data.next_cursor_str;
		// 	await sleep(100);
		// 	log('user count', users.length);
		// }
		// while (cursor !== '0');

		const data = await sendRequest({
			'type': RequestType.TWITTER_FOLLOWING_IDS,
		}) as {
			ids: string[];
		};

		log('data.ids.length', data.ids.length);

		const getIds = () => {
			// const ids = ids1(users);
			// const ids = ids2(users);

			// const ids = ids3(data);
			// const ids = ids4(data);

			switch (process.argv[2]) {
				case 'a': {
					return ids5(data);
				}
				case 'b': {
					return ids6(data);
				}
				default: {
					return [];
				}
			}
		};
		const ids = getIds();

		log(`ids.length`, ids.length);

		{
			const knex = Knex({
				'client': 'sqlite3',
				'connection': {
					'filename': path.resolve(dataPath, `ids.sqlite`),
				},
				'useNullAsDefault': true,
			});

			const exists = await knex.schema.hasTable(TableName.TWITTER_IDS);
			if (exists === false) {
				await knex.schema.createTable(TableName.TWITTER_IDS, table => {
					table.text('ids').notNullable();
					table.timestamps(true, true);
				});
			}

			await knex(TableName.TWITTER_IDS).insert({
				ids: ids.join(' '),
			});

			await knex.destroy();
		}

		let count = 0;
		const promises = Array.from(Array(5)).map(async () => {
			do {
				const id = ids.shift();

				if (typeof id !== 'string') { return; }

				await sleep(100);

				await fetch(id);
			}
			while (ids.length > 0);

			++count;
		});

		await Promise.all(promises);

		log(`done`);
	}
	catch (error) {
		console.log(error);
	}
})();
