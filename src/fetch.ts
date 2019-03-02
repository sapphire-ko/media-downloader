import path from 'path';

import Knex from 'knex';

import {
	TableName,
} from '~/constants';

import {
	RequestType,
	RateLimitStatus,
	Tweet,
	TwitterMediumType,
} from '~/models';

import {
	Authentication,
	Database,
	Twitter,
} from '~/libs';

import {
	sleep,
	mkdir,
	sendRequest,
} from '~/helpers';

import accounts from './accounts';

async function fetch(params: {
	id: string;
	screen_name: string;
}) {
	const {
		id,
		screen_name: screenName,
	} = params;

	const knex = Knex({
		'client': 'sqlite3',
		'connection': {
			'filename': path.resolve(__dirname, `../fetch/${id}.sqlite`),
		},
		'useNullAsDefault': true,
	});

	{
		const exists = await knex.schema.hasTable(TableName.TWITTER_TWEETS);
		if(exists === false) {
			await knex.schema.createTable(TableName.TWITTER_TWEETS, (table) => {
				table.string('id').primary().unique().notNullable();
				table.text('data').notNullable();
				table.timestamps(true, true);
			});
		}
	}
	{
		const exists = await knex.schema.hasTable(TableName.TWITTER_MEDIA);
		if(exists === false) {
			await knex.schema.createTable(TableName.TWITTER_MEDIA, (table) => {
				table.string('id').primary().unique().notNullable();
				table.string('tweet_id').notNullable();
				table.string('url').notNullable();
				table.boolean('downloaded').notNullable();
				table.integer('retry_count').notNullable();
			});
		}
	}

	try {
		await sleep(100);

		let maxId = '';
		// let shouldSkip = false;

		do {
			await sleep(10);

			const data = await sendRequest({
				'type': RequestType.TWITTER_SEARCH_UNIVERSAL,
				'params': {
					'screen_name': screenName,
					'max_id': maxId,
				},
			}) as {
				modules: Array<{
					status: {
						data: Tweet;
					};
				}>;
			};

			const tweets: Tweet[] = [];
			for(const module of data.modules) {
				if(module.status === undefined) {
					continue;
				}
				tweets.push(module.status.data);
			}

			console.log(tweets.length);

			for(const tweet of tweets) {
				await sleep(5);

				const rows = await knex(TableName.TWITTER_TWEETS).where({
					'id': tweet.id_str,
				});

				if(rows.length > 0) {
					// shouldSkip = true;
					continue;
				}

				await knex(TableName.TWITTER_TWEETS).insert({
					'id': tweet.id_str,
					'data': JSON.stringify(tweet),
				});

				if(tweet.retweeted_status !== undefined) {
					continue;
				}
				if(tweet.extended_entities === undefined) {
					continue;
				}

				const {
					extended_entities: entities,
				} = tweet;

				const media = entities.media.map((medium) => {
					let id: string | null = null;
					let url: string | null = null;

					switch(medium.type) {
						case TwitterMediumType.PHOTO: {
							id = medium.id_str;
							url = `${medium.media_url_https}:orig`;
							break;
						}
						case TwitterMediumType.VIDEO: {
							id = medium.id_str;
							url = medium.video_info.variants.filter((e) => {
								return e.content_type.startsWith('video');
							}).sort((a, b) => {
								return a.bitrate - b.bitrate;
							})[0].url;
							break;
						}
					}

					if(id === null || url === null) {
						return null;
					}

					return {
						'id': id,
						'tweet_id': tweet.id_str,
						'url': url,
						'downloaded': false,
						'retry_count': 0,
					};
				}).filter((medium) => {
					return medium !== null;
				});

				for(const medium of media) {
					const rows = await knex(TableName.TWITTER_MEDIA).where({
						'id': medium!.id,
					});

					if(rows.length > 0) {
						continue;
					}

					await knex(TableName.TWITTER_MEDIA).insert(medium);

					await sleep(10);
				}
			}

			// if(shouldSkip === true) {
			// 	console.log('skip');
			// }

			if(tweets.length > 1) {
				maxId = tweets[tweets.length - 1].id_str;
			}
			else {
				break;
			}
		}
		// while(shouldSkip === false);
		while(true);
	}
	catch(error) {
		console.log(error);
	}

	await knex.destroy();
}

(async () => {
	await mkdir(path.resolve(__path.root, 'fetch'));

	Twitter.createInstance();

	Authentication.createInstance();
	const auth = Authentication.getInstance();
	await auth.initialize();

	Database.createInstance();
	const database = Database.getInstance();

	const status = await sendRequest({
		'type': RequestType.TWITTER_RATE_LIMIT_STATUS,
	}) as RateLimitStatus;
	console.log(status.resources.search['/search/universal']);

	// const accounts = await database.getAccounts();
	for(const account of accounts) {
		await sleep(100);

		await fetch(account);
	}

	await database.close();
})();
