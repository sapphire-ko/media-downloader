import {
	RequestType,
} from '~/models';

interface TwitterVerifyCredentialsPayload {
	type: RequestType.TWITTER_VERIFY_CREDENTIALS;
}

interface TwitterRateLimitStatusPayload {
	type: RequestType.TWITTER_RATE_LIMIT_STATUS;
}

interface TwitterFollowingIDsPayload {
	type: RequestType.TWITTER_FOLLOWING_IDS;
}

interface TwitterHomeTimelinePayload {
	type: RequestType.TWITTER_HOME_TIMELINE;
	params: {
		since_id: string;
	};
}

export type RequestPayloadTwitter = (
	| TwitterVerifyCredentialsPayload
	| TwitterRateLimitStatusPayload
	| TwitterFollowingIDsPayload
	| TwitterHomeTimelinePayload
);

export type RequestPayload = (
	| RequestPayloadTwitter
);
