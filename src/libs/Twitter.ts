import {
	ServiceType,
	RequestType,
} from '~/models';

import {
	Authentication,
} from '~/libs';

import {
	sendRequest,
} from '~/helpers';

export class Twitter {
	private static instance: Twitter | null = null;

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

	public async initialize() {
		await this.isValid();
	}
}
