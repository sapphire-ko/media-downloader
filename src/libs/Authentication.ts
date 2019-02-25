import {
	ServiceType,
	Configuration,
} from '~/models';

import {
	Puppeteer,
	Twitter,
} from '~/libs';

import {
	readFile,
	writeFile,
} from '~/helpers';

type Configurations = {
	[P in ServiceType]: Configuration | null;
};

export class Authentication {
	private static instance: Authentication | null = null;

	private configurations: Configurations;
	private filename = `${__path.data}/credentials.json`;

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
		try {
			await this.import();
		}
		catch(error) {
			console.log(`${this.filename} does not exist`);
		}

		let shouldExport = false;

		{
			const type = ServiceType.TWITTER;

			if(this.configurations[type] === null) {
				const puppeteer = Puppeteer.getInstance();
				this.configurations[type] = await puppeteer.login(type);

				shouldExport = true;
			}

			const twitter = Twitter.getInstance();
			const isValid = await twitter.isValid();
			if(isValid === false) {
				this.configurations[type] = null;
			}
		}

		if(shouldExport === true) {
			this.export();
		}
	}

	private async import() {
		const data = await readFile(this.filename);
		this.configurations = JSON.parse(data);
	}

	private async export() {
		const data = JSON.stringify(this.configurations);
		await writeFile(this.filename, data);
	}

	public getConfiguration(type: ServiceType): Configuration {
		const configuration = this.configurations[type];
		if(configuration === null) {
			throw new Error('configuration is null');
		}
		return configuration;
	}
}
