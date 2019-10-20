import {
	ServiceType,
	CommandType,
	CommandTwitter,
	RequestType,
	Tweet,
	TwitterMediumType,
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

			try {
				await this.process(command);
			}
			catch(error) {
				console.log(error);
				this.queue.unshift(command);
			}
		}
		while(this.shouldProcess);
	}

	public async stop() {
		this.shouldProcess = false;
	}

	private async process(command: CommandTwitter): Promise<true> {
		switch(command.type) {
			case CommandType.TWITTER_RATE_LIMIT_STATUS: {
				const status = await this.sendRequest({
					'type': RequestType.TWITTER_RATE_LIMIT_STATUS,
				}) as RateLimitStatus;
				return true;
			}
			case CommandType.TWITTER_FOLLOWING_IDS: {
				const {
					ids,
				} = await this.sendRequest({
					'type': RequestType.TWITTER_FOLLOWING_IDS,
				}) as {
					ids: string[];
				};
				for(const id of ids) {
					const database = Database.getInstance();
					database.pushCommand({
						'type': CommandType.DATABASE_INSERT_ACCOUNT,
						'payload': {
							'id': id,
						},
					});
				}
				return true;
			}
			case CommandType.TWITTER_HOME_TIMELINE: {
				const tweets = await this.sendRequest({
					'type': RequestType.TWITTER_HOME_TIMELINE,
					'params': command.payload,
				}) as Tweet[];
				for(const tweet of tweets) {
					if(tweet.retweeted_status !== undefined) {
						continue;
					}

					const database = Database.getInstance();
					database.pushCommand({
						'type': CommandType.DATABASE_INSERT_TWEET,
						'payload': {
							'tweet': tweet,
						},
					});

					if(tweet.extended_entities === undefined) {
						continue;
					}

					const {
						extended_entities: entities,
					} = tweet;

					for(const medium of entities.media) {
						let id: string | null = null;
						let url: string | null = null;

						switch(medium.type) {
							case TwitterMediumType.PHOTO: {
								id = medium.id_str;
								url = `${medium.media_url_https}:orig`;
								break;
							}
							case TwitterMediumType.VIDEO: {
								id = medium.id_str;
								url = medium.video_info.variants.filter(e => {
									return e.content_type.startsWith('video');
								}).sort((a, b) => {
									return a.bitrate - b.bitrate;
								})[0].url;
								break;
							}
						}

						if(id !== null && url !== null) {
							database.pushCommand({
								'type': CommandType.DATABASE_INSERT_MEDIUM,
								'payload': {
									'id': id,
									'url': url,
									'accountId': tweet.user.id_str,
									'tweetId': tweet.id_str,
								},
							});
						}
					}
				}
				return true;
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
