import {
	CommandType,
} from '~/models';

import {
	Authentication,
	Database,
	Puppeteer,
	Twitter,
} from '~/libs';

import {
	sleep,
} from './helpers';

export class App {
	public async initialize() {
		{
			Database.createInstance();
			const database = Database.getInstance();
			await database.initialize();
		}

		{
			Puppeteer.createInstance();
			const puppeteer = Puppeteer.getInstance();
			await puppeteer.initialize();
		}

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
	}

	public async start() {
		const database = Database.getInstance();
		database.start();

		const twitter = Twitter.getInstance();
		twitter.start();

		do {
			twitter.pushCommand({
				'type': CommandType.TWITTER_HOME_TIMELINE,
				'payload': {
					'since_id': '',
				},
			});
			twitter.pushCommand({
				'type': CommandType.TWITTER_FOLLOWING_IDS,
			});
			twitter.pushCommand({
				'type': CommandType.TWITTER_RATE_LIMIT_STATUS,
			});

			await sleep(60000);
		}
		while(true);
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
