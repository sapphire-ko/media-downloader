import fetch from 'node-fetch';
import qs from 'qs';
import AbortController from 'abort-controller';
import { API_URL_TWITTER } from '~/constants';
import { Authentication } from '~/libs';
import {
	ServiceType,
	RequestType,
	RequestMethodType,
	RequestPayload,
} from '~/models';
import { log } from './log';

function getServiceType(payload: RequestPayload): ServiceType {
	switch (payload.type) {
		case RequestType.TWITTER_VERIFY_CREDENTIALS:
		case RequestType.TWITTER_RATE_LIMIT_STATUS:
		case RequestType.TWITTER_USER:
		case RequestType.TWITTER_FOLLOWING_IDS:
		case RequestType.TWITTER_FOLLOWING_LIST:
		case RequestType.TWITTER_HOME_TIMELINE:
		case RequestType.TWITTER_USER_TIMELINE:
		case RequestType.TWITTER_SEARCH_UNIVERSAL: {
			return ServiceType.TWITTER;
		}
	}
}

function getHeaders(payload: RequestPayload) {
	const serviceType = getServiceType(payload);

	switch (serviceType) {
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
	switch (payload.type) {
		case RequestType.TWITTER_VERIFY_CREDENTIALS:
		case RequestType.TWITTER_RATE_LIMIT_STATUS:
		case RequestType.TWITTER_USER:
		case RequestType.TWITTER_FOLLOWING_IDS:
		case RequestType.TWITTER_FOLLOWING_LIST:
		case RequestType.TWITTER_HOME_TIMELINE:
		case RequestType.TWITTER_USER_TIMELINE:
		case RequestType.TWITTER_SEARCH_UNIVERSAL: {
			return RequestMethodType.GET;
		}
	}
}

function getURL(payload: RequestPayload): string {
	switch (payload.type) {
		case RequestType.TWITTER_VERIFY_CREDENTIALS: {
			return `${API_URL_TWITTER}/account/verify_credentials.json`;
		}
		case RequestType.TWITTER_RATE_LIMIT_STATUS: {
			return `${API_URL_TWITTER}/application/rate_limit_status.json`;
		}
		case RequestType.TWITTER_USER: {
			const params = {
				'user_id': payload.params.user_id,
			};
			const query = qs.stringify(params);
			return `${API_URL_TWITTER}/users/show.json?${query}`;
		}
		case RequestType.TWITTER_FOLLOWING_IDS: {
			const params: any = {
				'count': 5000,
				'stringify_ids': true,
			};
			const query = qs.stringify(params);
			return `${API_URL_TWITTER}/friends/ids.json?${query}`;
		}
		case RequestType.TWITTER_FOLLOWING_LIST: {
			const params: any = {
				'count': 200,
			};
			if (payload.params.cursor !== '') {
				params.cursor = payload.params.cursor;
			}
			if (payload.params.screen_name) {
				params.screen_name = payload.params.screen_name;
			}
			const query = qs.stringify(params);
			return `${API_URL_TWITTER}/friends/list.json?${query}`;
		}
		case RequestType.TWITTER_HOME_TIMELINE: {
			const params: any = {
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
			};
			if (payload.params.since_id !== '') {
				params.since_id = payload.params.since_id;
			}
			const query = qs.stringify(params);
			return `${API_URL_TWITTER}/statuses/home_timeline.json?${query}`;
		}
		case RequestType.TWITTER_USER_TIMELINE: {
			const {
				user_id,
				max_id,
			} = payload.params;

			const params: any = {
				'count': '200',
				'include_my_retweet': '1',
				'include_rts': '1',
				'cards_platform': 'Web-13',
				'include_entities': '1',
				'include_user_entities': '1',
				'include_cards': '1',
				'send_error_codes': '1',
				'tweet_mode': 'extended',
				'include_ext_alt_text': 'true',
				'include_reply_count': 'true',
				'user_id': user_id,
			};

			if (max_id !== '') {
				params.max_id = max_id;
			}
			const query = qs.stringify(params);
			return `${API_URL_TWITTER}/statuses/user_timeline.json?${query}`;
		}
		case RequestType.TWITTER_SEARCH_UNIVERSAL: {
			const {
				screen_name,
				max_id,
			} = payload.params;

			const params: any = {
				'count': '200',
				'modules': 'status',
				'result_type': 'recent',
				'pc': 'false',
				'ui_lang': 'en-US',
				'cards_platform': 'Web-13',
				'include_entities': '1',
				'include_user_entities': '1',
				'include_cards': '1',
				'include_rts': '1',
				'send_error_codes': '1',
				'tweet_mode': 'extended',
				'include_ext_alt_text': 'true',
				'include_reply_count': 'true',
			};

			params.q = `from:${screen_name}`;
			if (max_id !== '') {
				params.q += ` max_id:${max_id}`;
			}

			const query = qs.stringify(params);
			return `${API_URL_TWITTER}/search/universal.json?${query}`;
		}
	}
}

export async function sendRequest(payload: RequestPayload): Promise<any> {
	const headers = getHeaders(payload);
	const methodType = getRequestMethod(payload);
	const url = getURL(payload);

	log('info', payload);

	try {
		const getResponse = async (controller: AbortController) => {
			switch (methodType) {
				case RequestMethodType.GET: {
					return await fetch(url, {
						'method': 'get',
						'headers': headers,
						signal: controller.signal,
					});
				}
				case RequestMethodType.POST: {
					return await fetch(url, {
						'method': 'post',
						'headers': headers,
						signal: controller.signal,
					});
				}
			}
		};
		const controller = new AbortController();
		const timeout = setTimeout(() => {
			log('info', 'abort', url);
			controller.abort();
		}, 10000);

		try {
			const response = await getResponse(controller);

			if (response === null) {
				throw new Error('failed to send request');
			}

			if (response.status !== 200) {
				throw new Error(response.statusText);
			}

			return await response.json();
		}
		catch (error) {
			log(error);
		}
		finally {
			clearTimeout(timeout);
		}

		throw new Error('invalid');
	}
	catch (error) {
		log('error', error);
	}
}
