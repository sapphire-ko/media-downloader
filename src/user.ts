import {
	RequestType,
	AccountTwitter,
} from '~/models';

import {
	Authentication,
	Twitter,
} from '~/libs';

import {
	sleep,
	sendRequest,
} from '~/helpers';

(async () => {
	Twitter.createInstance();

	Authentication.createInstance();
	const auth = Authentication.getInstance();
	await auth.initialize();

	let cursor = '';

	let users: AccountTwitter[] = [];

	do {
		await sleep(100);

		const list = await sendRequest({
			'type': RequestType.TWITTER_FOLLOWING_LIST,
			'params': {
				'cursor': cursor,
			},
		}) as {
			users: AccountTwitter[];
			next_cursor_str: string;
			previous_cursor_str: string;
		};

		console.log(list.users.length);

		users = users.concat(list.users);

		cursor = list.next_cursor_str;

		if(cursor === '0') {
			break;
		}
	}
	while(true);

	console.log(JSON.stringify(users.map((user) => {
		return {
			'id': user.id_str,
			'screen_name': user.screen_name,
			'tweet_count': user.statuses_count,
		};
	})));
})();
