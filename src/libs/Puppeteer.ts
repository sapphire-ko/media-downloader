import path from 'path';

import puppeteer from 'puppeteer';

import {
	mkdir,
	sleep,
} from '~/helpers';

export class Puppeteer {
	private static instance: Puppeteer | null = null;

	private browser: puppeteer.Browser | null = null;

	private constructor() {}

	public static createInstance() {
		if(this.instance !== null) {
			throw new Error('cannot create puppeteer instance');
		}
		this.instance = new Puppeteer();
	}

	public static getInstance(): Puppeteer {
		if(this.instance === null) {
			throw new Error('puppeteer instance is not created');
		}
		return this.instance;
	}

	private async waitElement(page: puppeteer.Page, selector: string) {
		let shouldWait = true;
		do {
			await sleep(500);

			try {
				await page.focus(selector);
				shouldWait = false;
			}
			catch(err) {
				shouldWait = true;
			}
		}
		while(shouldWait);
	}

	private clearInput(page: puppeteer.Page, selector: string) {
		return page.evaluate((selector: string) => {
			const field = document.querySelector(selector) as HTMLInputElement;
			if(field === null) {
				return;
			}
			field.value = '';
		}, selector);
	}

	private async login(page: puppeteer.Page) {
		const {
			username,
			password,
		} = __account;

		await this.waitElement(page, '.js-username-field');
		await this.waitElement(page, '.js-password-field');

		{
			let shouldWait = true;

			do {
				await sleep(500);

				await this.clearInput(page, '.js-username-field');
				await page.type('.js-username-field', username);

				await sleep(500);

				await this.clearInput(page, '.js-password-field');
				await page.type('.js-password-field', password);

				const values = await page.evaluate(() => {
					const usernameField = document.querySelector('.js-username-field') as HTMLInputElement;
					const passwordField = document.querySelector('.js-password-field') as HTMLInputElement;

					if(usernameField === null || passwordField === null) {
						return null;
					}
					return {
						'username': usernameField.value,
						'password': passwordField.value,
					};
				});

				if(values === null) {
					continue;
				}

				if(values.username === username && values.password === password) {
					shouldWait = false;
				}
			}
			while(shouldWait);
		}

		await page.keyboard.press('Enter');

		return page;
	}

	public async initialize() {
		await mkdir(__path.data);

		this.browser = await puppeteer.launch({
			'headless': __dev ? false : true,
			'args': [
				'--no-sandbox',
			],
		});

		const page = await this.browser.newPage();
		await page.goto('https://tweetdeck.twitter.com/', {
			'waitUntil': 'domcontentloaded',
		});

		await this.waitElement(page, '.js-login-form .Button--primary');

		await page.click('.js-login-form .Button--primary');

		await this.login(page);

		await this.waitElement(page, '.tweet-avatar');

		const userAgent = await page.evaluate(() => {
			return window.navigator.userAgent;
		}) as string;

		const bearerToken = await page.evaluate(() => {
			return (window as any).TD.config.bearer_token;
		}) as string;

		const cookie = (await page.cookies()).map((cookie) => {
			return `${cookie.name}="${cookie.value}"`;
		}).join('; ');

		await page.close();

		console.log({
			'userAgent': userAgent,
			'bearerToken': bearerToken,
			'csrfToken': cookie.match(/ct0="(.+?)";/i)![1],
			'cookie': cookie,
		});
	}
}
