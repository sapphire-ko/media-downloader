import path from 'path';

import Knex from 'knex';

import {
	TableName,
} from '~/constants';

import {
	RequestType,
	RateLimitStatus,
	AccountTwitter,
	Tweet,
	TwitterMediumType,
} from '~/models';

import {
	Authentication,
	Twitter,
} from '~/libs';

import {
	sleep,
	mkdir,
	sendRequest,
} from '~/helpers';

async function fetch(id: string) {
	const knex = Knex({
		'client': 'sqlite3',
		'connection': {
			'filename': path.resolve(__path.data, `${id}.sqlite`),
		},
		'useNullAsDefault': true,
	});

	{
		const exists = await knex.schema.hasTable(TableName.TWITTER_ACCOUNTS);
		if(exists === false) {
			await knex.schema.createTable(TableName.TWITTER_ACCOUNTS, (table) => {
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

	{
		const rows = await knex(TableName.TWITTER_ACCOUNTS).limit(1);
		if(rows.length === 0) {
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
			catch(error) {
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

		if(isFetched === false) {
			const rows = await knex(TableName.TWITTER_TWEETS).select('id').orderByRaw('length(id)').limit(1);
			if(rows.length > 0) {
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
					if(isFetched === true) {
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

			if(tweets.length > 1) {
				maxId = tweets[tweets.length - 1].id_str;
			}
			else {
				if(isFetched === false) {
					await knex(TableName.TWITTER_ACCOUNTS).where({
						'id': id,
					}).update({
						'is_fetched': true,
					});
				}
				break;
			}
		}
		while(shouldSkip === false);
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

	const status = await sendRequest({
		'type': RequestType.TWITTER_RATE_LIMIT_STATUS,
	}) as RateLimitStatus;
	console.log(status.resources.search['/search/universal']);

	const data = await sendRequest({
		'type': RequestType.TWITTER_FOLLOWING_IDS,
	}) as {
		ids: string[];
	};

	for(const id of data.ids) {
		await sleep(100);

		await fetch(id);
	}
})();
