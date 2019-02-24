import {
	RequestType,
} from '~/models';

interface TwitterVerifyCredentialsPayload {
	type: RequestType.TWITTER_VERIFY_CREDENTIALS;
}

interface TwitterRateLimitStatusPayload {
	type: RequestType.TWITTER_RATE_LIMIT_STATUS;
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
	| TwitterHomeTimelinePayload
);

export type RequestPayload = (
	| RequestPayloadTwitter
);
