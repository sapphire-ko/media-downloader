import {
	ServiceType,
	CommandType,
	CommandTwitter,
	RequestType,
} from '~/models';

import {
	Authentication,
} from '~/libs';

import {
	sleep,
	sendRequest,
} from '~/helpers';

export class Twitter {
	private static instance: Twitter | null = null;

	private queue: CommandTwitter[] = [];
	private shouldProcess = false;

	private serviceType = ServiceType.TWITTER;

	private constructor() {}

	public static createInstance() {
		if(this.instance !== null) {
			throw new Error('cannot create instance');
		}
		this.instance = new Twitter();
	}

	public static getInstance(): Twitter {
		if(this.instance === null) {
			throw new Error('instance is null');
		}
		return this.instance;
	}

	public async initialize() {
		this.shouldProcess = true;
	}

	public async start() {
		do {
			await sleep(1000);

			if(this.queue.length === 0) {
				continue;
			}

			const command = this.queue.shift()!;

			await this.process(command);
		}
		while(this.shouldProcess);
	}

	private async process(command: CommandTwitter) {
		console.log(command);
	}

	public async isValid(): Promise<boolean> {
		const authentication = Authentication.getInstance();
		authentication.getConfiguration(this.serviceType);

		try {
			await sendRequest({
				'type': RequestType.TWITTER_VERIFY_CREDENTIALS,
			});

			return true;
		}
		catch(error) {
			return false;
		}
	}
}
