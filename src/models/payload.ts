import {
	RequestType,
} from '~/models';

interface TwitterVerifyCredentialsPayload {
	type: RequestType.TWITTER_VERIFY_CREDENTIALS;
}

interface TwitterHomeTimelinePayload {
	type: RequestType.TWITTER_HOME_TIMELINE;
	params: {
		since_id: string;
	};
}

export type RequestPayload = (
	| TwitterVerifyCredentialsPayload
	| TwitterHomeTimelinePayload
);
