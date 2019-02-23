import fetch, {
	Response,
} from 'node-fetch';
import qs from 'qs';

import {
	API_URL_TWITTER,
} from '~/constants';

import {
	ServiceType,
	RequestType,
	RequestMethodType,
	RequestPayload,
} from '~/models';

import {
	Authentication,
} from '~/libs';

function getServiceType(payload: RequestPayload): ServiceType {
	switch(payload.type) {
		case RequestType.TWITTER_HOME_TIMELINE: {
			return ServiceType.TWITTER;
		}
	}
}

function getHeaders(payload: RequestPayload): AnyObject {
	const serviceType = getServiceType(payload);

	switch(serviceType) {
		case ServiceType.TWITTER: {
			const authentication = Authentication.getInstance();
			const {
				bearerToken,
				csrfToken,
				cookie,
				userAgent,
			} = authentication.getConfiguration(serviceType);

			return {
				'authorization': `Bearer ${bearerToken}`,
				'cookie': cookie,
				'user-agent': userAgent,
				'x-csrf-token': csrfToken,
			};
		}
	}
}

function getRequestMethod(payload: RequestPayload): RequestMethodType {
	switch(payload.type) {
		case RequestType.TWITTER_HOME_TIMELINE: {
			return RequestMethodType.GET;
		}
	}
}

function getURL(payload: RequestPayload): string {
	switch(payload.type) {
		case RequestType.TWITTER_HOME_TIMELINE: {
			const query = qs.stringify({
				'count': '200',
				'include_my_retweet': '1',
				'cards_platform': 'Web-13',
				'include_entities': '1',
				'include_user_entities': '1',
				'include_cards': '1',
				'send_error_codes': '1',
				'tweet_mode': 'extended',
				'include_ext_alt_text': 'true',
				'include_reply_count': 'true',
				...payload.params,
			});
			return `${API_URL_TWITTER}/statuses/home_timeline.json?${query}`;
		}
	}
}

export async function sendRequest(payload: RequestPayload): Promise<any> {
	const headers = getHeaders(payload);
	const methodType = getRequestMethod(payload);
	const url = getURL(payload);

	let response: Response | null = null;

	switch(methodType) {
		case RequestMethodType.GET: {
			response = await fetch(url, {
				'method': 'get',
				'headers': headers,
			});
			break;
		}
		case RequestMethodType.POST: {
			response = await fetch(url, {
				'method': 'post',
				'headers': headers,
			});
			break;
		}
	}

	if(response === null) {
		throw new Error('failed to send request');
	}

	try {
		const data = await response.json();

		if(response.status !== 200) {
			throw new Error(response.statusText);
		}

		return data;
	}
	catch(error) {
		throw error;
	}
}