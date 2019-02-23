import {
	ServiceType,
	RequestType,
} from '~/models';

interface TwitterHomeTimelinePayload {
	type: RequestType.TWITTER_HOME_TIMELINE;
	params: {
		since_id: string;
	};
}

export type RequestPayload = (
	| TwitterHomeTimelinePayload
);
