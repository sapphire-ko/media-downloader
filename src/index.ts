import {
	Puppeteer,
} from '~/libs';

(async () => {
	Puppeteer.createInstance();
	const puppeteer = Puppeteer.getInstance();
	await puppeteer.initialize();
})();
