import { dataPath } from './constants';
import {
	mkdir,
	sleep,
} from './helpers';
import {
	Authentication,
	Database,
	Downloader,
	Puppeteer,
	Twitter,
} from '~/libs';
import { CommandType } from '~/models';

export class App {
	public async initialize() {
		await mkdir(dataPath);

		{
			Database.createInstance();
			const database = Database.getInstance();
			await database.initialize();
		}

		// {
		// 	Puppeteer.createInstance();
		// 	const puppeteer = Puppeteer.getInstance();
		// 	await puppeteer.initialize();
		// }

		{
			Twitter.createInstance();
			const twitter = Twitter.getInstance();
			await twitter.initialize();
		}

		{
			Authentication.createInstance();
			const authentication = Authentication.getInstance();
			await authentication.initialize();
		}

		{
			Downloader.createInstance();
		}
	}

	public async start() {
		const database = Database.getInstance();
		database.start();

		const twitter = Twitter.getInstance();
		twitter.start();

		const downloader = Downloader.getInstance();

		twitter.pushCommand({
			'type': CommandType.TWITTER_FOLLOWING_IDS,
		});
		twitter.pushCommand({
			'type': CommandType.TWITTER_RATE_LIMIT_STATUS,
		});

		do {
			twitter.pushCommand({
				'type': CommandType.TWITTER_HOME_TIMELINE,
				'payload': {
					'since_id': '',
				},
			});

			await downloader.downloadMedia();

			await sleep(30000);
		}
		while (true);
	}

	public async stop() {
		{
			const database = Database.getInstance();
			database.stop();
		}

		{
			const twitter = Twitter.getInstance();
			twitter.stop();
		}
	}
}
