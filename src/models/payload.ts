import {
	RequestType,
} from '~/models';

interface TwitterVerifyCredentialsPayload {
	type: RequestType.TWITTER_VERIFY_CREDENTIALS;
}

interface TwitterRateLimitStatusPayload {
	type: RequestType.TWITTER_RATE_LIMIT_STATUS;
}

interface TwitterUserPayload {
	type: RequestType.TWITTER_USER;
	params: {
		user_id: string;
	};
}

interface TwitterFollowingIdsPayload {
	type: RequestType.TWITTER_FOLLOWING_IDS;
}

interface TwitterFollowingListPayload {
	type: RequestType.TWITTER_FOLLOWING_LIST;
	params: {
		cursor: string;
		skip_status?: boolean;
		include_user_entities?: boolean;
		screen_name?: string;
	};
}

interface TwitterHomeTimelinePayload {
	type: RequestType.TWITTER_HOME_TIMELINE;
	params: {
		since_id: string;
	};
}

interface TwitterUserTimelinePayload {
	type: RequestType.TWITTER_USER_TIMELINE;
	params: {
		user_id: string;
		max_id: string;
	};
}

interface TwitterSearchUniversalPayload {
	type: RequestType.TWITTER_SEARCH_UNIVERSAL;
	params: {
		screen_name: string;
		max_id: string;
	};
}

export type RequestPayloadTwitter = (
	| TwitterVerifyCredentialsPayload
	| TwitterRateLimitStatusPayload
	| TwitterUserPayload
	| TwitterFollowingIdsPayload
	| TwitterFollowingListPayload
	| TwitterHomeTimelinePayload
	| TwitterUserTimelinePayload
	| TwitterSearchUniversalPayload
);

export type RequestPayload = (
	| RequestPayloadTwitter
);
