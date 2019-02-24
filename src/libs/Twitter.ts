import {
	ServiceType,
	CommandType,
	CommandTwitter,
	RequestType,
	Tweet,
	RequestPayloadTwitter,
	RateLimitStatus,
} from '~/models';

import {
	Authentication,
	Database,
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

	public pushCommand(command: CommandTwitter) {
		this.queue.push(command);
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

	public async stop() {
		this.shouldProcess = false;
	}

	private async process(command: CommandTwitter) {
		switch(command.type) {
			case CommandType.TWITTER_RATE_LIMIT_STATUS: {
				const status = await this.sendRequest({
					'type': RequestType.TWITTER_RATE_LIMIT_STATUS,
				}) as RateLimitStatus;

				break;
			}
			case CommandType.TWITTER_HOME_TIMELINE: {
				const tweets = await this.sendRequest({
					'type': RequestType.TWITTER_HOME_TIMELINE,
					'params': command.payload,
				}) as Tweet[];

				for(const tweet of tweets) {
					const database = Database.getInstance();
					database.pushCommand({
						'type': CommandType.DATABASE_INSERT_TWEET,
						'payload': {
							'tweet': tweet,
						},
					});
				}

				break;
			}
		}
	}

	private async sendRequest(payload: RequestPayloadTwitter) {
		const authentication = Authentication.getInstance();
		authentication.getConfiguration(this.serviceType);

		return sendRequest(payload);
	}

	public async isValid(): Promise<boolean> {
		const authentication = Authentication.getInstance();
		authentication.getConfiguration(this.serviceType);

		try {
			this.sendRequest({
				'type': RequestType.TWITTER_VERIFY_CREDENTIALS,
			});

			return true;
		}
		catch(error) {
			return false;
		}
	}
}
