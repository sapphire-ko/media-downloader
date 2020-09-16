import schedule from 'node-schedule';
import { dataPath } from './constants';
import { mkdir } from './helpers';
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

		Database.createInstance();
		const database = Database.getInstance();
		await database.initialize();

		// {
		// 	Puppeteer.createInstance();
		// 	const puppeteer = Puppeteer.getInstance();
		// 	await puppeteer.initialize();
		// }

		Twitter.createInstance();

		{
			Authentication.createInstance();
			const authentication = Authentication.getInstance();
			await authentication.initialize();
		}

		Downloader.createInstance();
	}

	public async start() {
		const twitter = Twitter.getInstance();

		const downloader = Downloader.getInstance();

		await twitter.process({
			type: CommandType.TWITTER_FOLLOWING_IDS,
		});
		await twitter.process({
			type: CommandType.TWITTER_RATE_LIMIT_STATUS,
		});

		schedule.scheduleJob('0,30 * * * * *', async () => {
			await twitter.process({
				type: CommandType.TWITTER_HOME_TIMELINE,
				payload: {
					since_id: '',
				},
			});

			await downloader.downloadMedia();
		});
	}
}
