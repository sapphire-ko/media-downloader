import fs from 'fs';
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
import { compress } from './helpers/zlib';

interface Medium {
	tweet_id: string;
	url: string;
	downloaded: boolean;
	retry_count: number;
}

async function fetch(id: string) {
	const knex = Knex({
		client: 'sqlite3',
		connection: {
			filename: path.resolve(dataPath, `${id}.sqlite`),
		},
		useNullAsDefault: true,
	});

	const rows = await knex(TableName.TWITTER_ACCOUNTS).limit(1);
	const {
		screen_name: screenName,
		is_fetched,
	} = rows[0];

	// const isFetched = is_fetched === 1;
	const isFetched = false as boolean;

	try {
		await sleep(100);

		let maxId = '';
		let shouldSkip = false;

		if (isFetched === false) {
			const rows = await knex(TableName.TWITTER_TWEETS).select('id').orderByRaw('length(id), id').limit(1);
			if (rows.length > 0) {
				maxId = rows[0].id;
			}
		}

		do {
			await sleep(100);

			const data = await sendRequest({
				type: RequestType.TWITTER_SEARCH_UNIVERSAL,
				params: {
					screen_name: screenName,
					max_id: maxId,
				},
			}) as { modules: { status: { data: Tweet; }; }[]; };

			const tweets: Tweet[] = [];
			for (const module of data.modules) {
				if (module.status === undefined) {
					continue;
				}
				tweets.push(module.status.data);
			}

			log('info', `tweets.length`, tweets.length);

			for (const tweet of tweets) {
				await sleep(5);

				const rows = await knex(TableName.TWITTER_TWEETS).where({
					id: tweet.id_str,
				});

				if (rows.length > 0) {
					if (isFetched === true) {
						shouldSkip = true;
						continue;
					}
				}
				else {
					await knex(TableName.TWITTER_TWEETS).insert({
						id: tweet.id_str,
						data: await compress(tweet),
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
							case TwitterMediumType.VIDEO:
							case TwitterMediumType.ANIMATED_GIF: {
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
						tweet_id: tweet.id_str,
						url,
						downloaded: false,
						retry_count: 0,
					};
				}).filter((x): x is Medium => x !== null);

				for (const medium of media) {
					const rows = await knex(TableName.TWITTER_MEDIA).where({
						url: medium.url,
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
						id,
					}).update({
						is_fetched: true,
					});
				}
				break;
			}
		}
		while (shouldSkip === false);
	}
	catch (error) {
		log('error', error);
	}

	await knex.destroy();
}

(async () => {
	try {
		Twitter.createInstance();

		Authentication.createInstance();
		const auth = Authentication.getInstance();
		await auth.initialize();

		const status = await sendRequest({
			'type': RequestType.TWITTER_RATE_LIMIT_STATUS,
		}) as RateLimitStatus;
		log('info', status.resources.friends['/friends/list']);
		log('info', status.resources.search['/search/universal']);

		// log('info', 'data.ids.length', data.ids.length);

		const getIds = async (key: string) => {
			const keys = [
				'a',
				'b',
				'c',
				'd',
				'e',
			];

			const index = keys.indexOf(key);
			if (index === -1) {
				return [];
			}

			const files = await fs.promises.readdir(dataPath);
			const ids = files.filter(x => x.endsWith('.sqlite')).filter(x => !isNaN(parseInt(x.substr(0, 3), 10))).map(x => x.split('.')[0]);
			const data = { ids }

			return data.ids.filter(id => {
				const subId = id.substr(-3);
				const x = parseInt(subId, 10) % keys.length;
				return x === index;
			});
		};
		const ids = await getIds(process.argv[2]);

		log('info', `ids.length`, ids.length);

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

		log('info', `done`);
	}
	catch (error) {
		log('error', error);
	}
})();
