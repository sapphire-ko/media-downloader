import url from 'url';

import puppeteer from 'puppeteer';

import {
	ServiceType,
	Configuration,
	Tweet,
} from '~/models';

import {
	sleep,
} from '~/helpers';

export class Puppeteer {
	private static instance: Puppeteer | null = null;

	private browser: puppeteer.Browser | null = null;

	private constructor() {}

	public static createInstance() {
		if(this.instance !== null) {
			throw new Error('cannot create instance');
		}
		this.instance = new Puppeteer();
	}

	public static getInstance(): Puppeteer {
		if(this.instance === null) {
			throw new Error('instance is not created');
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

	public async login(type: ServiceType): Promise<Configuration> {
		if(this.browser === null) {
			throw new Error('browser is null');
		}

		switch(type) {
			case ServiceType.TWITTER: {
				const page = await this.browser.newPage();

				await page.goto('https://tweetdeck.twitter.com/', {
					'waitUntil': 'domcontentloaded',
				});

				await this.waitElement(page, '.js-login-form .Button--primary');

				await page.click('.js-login-form .Button--primary');

				const {
					username,
					password,
				} = __account.twitter;

				const usernameSelector = 'input[name="session[username_or_email]"]';
				const passwordSelector = 'input[name="session[password]"]';

				await this.waitElement(page, usernameSelector);
				await this.waitElement(page, passwordSelector);

				{
					let shouldWait = true;

					do {
						await sleep(500);

						await this.clearInput(page, usernameSelector);
						await page.type(usernameSelector, username);

						await sleep(500);

						await this.clearInput(page, passwordSelector);
						await page.type(passwordSelector, password);

						const values = await page.evaluate(() => {
							const usernameField = document.querySelector('input[name="session[username_or_email]"]') as HTMLInputElement;
							const passwordField = document.querySelector('input[name="session[password]"]') as HTMLInputElement;

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

				await this.waitElement(page, '.tweet-avatar');

				const userAgent = await page.evaluate(() => {
					return window.navigator.userAgent;
				}) as string;

				const bearerToken = await page.evaluate(() => {
					return (window as any).TD.config.bearer_token;
				}) as string;

				const cookies = await page.cookies();
				const cookie = cookies.filter(cookie => {
					return cookie.domain === '.twitter.com';
				}).map(cookie => {
					return `${cookie.name}=${cookie.value}`;
				}).join('; ');

				await page.close();

				return {
					'type': ServiceType.TWITTER,
					'userAgent': userAgent,
					'bearerToken': bearerToken,
					'csrfToken': cookies.find(cookie => {
						return cookie.name === 'ct0';
					})!.value,
					'cookie': cookie,
				};
			}
		}
	}

	private queue: Tweet[][] = [];
	private shouldProcess = false;

	private async process(page: puppeteer.Page) {
		do {
			await sleep(100);

			console.log(`queue=${this.queue.length}`);

			if(this.queue.length === 0) {
				continue;
			}

			const tweets = this.queue.shift()!;

			console.log(tweets.length);

			await page.evaluate(_ => {
				const list = document.querySelector('#open-modal .js-column-scroller');
				if(list === null) {
					return;
				}
				list.scrollTop = list.scrollHeight;
			});
		}
		while(this.shouldProcess);
	}

	public async fetchUserTimeline(screenName: string) {
		if(this.browser === null) {
			throw new Error('browser is null');
		}

		try {
			const page = await this.browser.newPage();

			await page.goto('https://tweetdeck.twitter.com/', {
				'waitUntil': 'domcontentloaded',
			});

			this.shouldProcess = true;
			this.process(page);

			page.on('response', async response => {
				const {
					pathname,
				} = url.parse(response.url());
				if(pathname!.endsWith('statuses/user_timeline.json') !== true) {
					return;
				}

				const request = response.request();
				if(request.method() !== 'GET') {
					return;
				}

				const tweets = await response.json();
				this.queue.push(tweets);
			});

			const searchSelector = '[data-action="show-search"]';
			await this.waitElement(page, searchSelector);
			await page.click(searchSelector);

			const inputSelector = '.search-input.is-focused';
			await this.waitElement(page, inputSelector);
			await this.clearInput(page, inputSelector);
			await page.type(inputSelector, screenName);

			const accountSelector = '.account-summary .username';
			await this.waitElement(page, accountSelector);
			await page.click(accountSelector);

			const tweetsSelector = '.js-item-launch[data-type="tweets"]';
			await this.waitElement(page, tweetsSelector);
			await page.click(tweetsSelector);
		}
		catch(error) {
			console.log(error);
		}
	}

	public async initialize() {
		this.browser = await puppeteer.launch({
			// 'headless': __dev ? false : true,
			'headless': true,
			'args': [
				'--no-sandbox',
			],
		});
	}
}
