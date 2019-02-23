import {
	Authentication,
	Puppeteer,
	Twitter,
} from '~/libs';

export class App {
	public async initialize() {
		{
			Puppeteer.createInstance();
			const puppeteer = Puppeteer.getInstance();
			await puppeteer.initialize();
		}

		{
			Authentication.createInstance();
			const authentication = Authentication.getInstance();
			await authentication.initialize();
		}

		{
			Twitter.createInstance();
			const twitter = Twitter.getInstance();
			await twitter.initialize();
		}
	}
}