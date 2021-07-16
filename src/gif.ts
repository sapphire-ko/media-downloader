import fs from 'fs';
import path from 'path';
import Knex from 'knex';
import {
	dataPath,
	TableName,
} from '~/constants';
import {
	decompress,
	log,
	sleep,
} from '~/helpers';
import { Tweet, TwitterMediumType } from './models';

interface Medium {
	tweet_id: string;
	url: string;
	downloaded: boolean;
	retry_count: number;
}

async function process(params: {
	index: number;
	accountId: string;
}) {
	const {
		index,
		accountId,
	} = params;

	const knex = Knex({
		client: 'sqlite3',
		connection: {
			filename: path.resolve(dataPath, `${accountId}.sqlite`),
		},
		useNullAsDefault: true,
	});

	let count = 0;

	try {
		const rows = await knex(TableName.TWITTER_TWEETS);

		for (const row of rows) {
			const tweet = await decompress<Tweet>(row.data);

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

				++count;
			}
			log('info', `[${index}]`, accountId, media.length);
		}
	}
	catch (error) {
		log('error', error);
	}

	await knex.destroy();

	return count;
}

(async () => {
	try {
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

		const PROMISE_COUNT = 10;

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
					accountId: id,
				});
				count += x;
			}
			while (filenames.length > 0);

			log('info', `[${i}]`, `done`);
		});
		await Promise.all(promises);

		log('info', `count`, count);
	}
	catch (error) {
		console.trace(error);
	}
})();
