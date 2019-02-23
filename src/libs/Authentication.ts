import {
	ServiceType,
	Configuration,
} from '~/models';

import {
	Puppeteer,
} from '~/libs';

export class Authentication {
	private static instance: Authentication | null = null;

	private configurations: {
		[P in ServiceType]: Configuration | null;
	};

	private constructor() {
		this.configurations = {
			[ServiceType.TWITTER]: null,
		};
	}

	public static createInstance() {
		if(this.instance !== null) {
			throw new Error('cannot create instance');
		}
		this.instance = new Authentication();
	}

	public static getInstance(): Authentication {
		if(this.instance === null) {
			throw new Error('instance is null');
		}
		return this.instance;
	}

	public async initialize() {
		{
			const type = ServiceType.TWITTER;

			const puppeteer = Puppeteer.getInstance();
			this.configurations[type] = await puppeteer.login(type);
		}
	}

	public getConfiguration(type: ServiceType): Configuration {
		const configuration = this.configurations[type];
		if(configuration === null) {
			throw new Error('configuration is null');
		}
		return configuration;
	}
}
