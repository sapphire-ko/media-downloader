import {
	Tweet,
} from '~/models';

export enum CommandType {
	TWITTER_RATE_LIMIT_STATUS = 100001,
	TWITTER_HOME_TIMELINE,
	DATABASE_INSERT_TWEET = 200001,
	DATABASE_UPDATE_TWEET,
}

interface CommandTwitterRateLimitStatus {
	type: CommandType.TWITTER_RATE_LIMIT_STATUS;
}

interface CommandTwitterHomeTimeline {
	type: CommandType.TWITTER_HOME_TIMELINE;
	payload: {
		since_id: string;
	};
}

export type CommandTwitter = (
	| CommandTwitterRateLimitStatus
	| CommandTwitterHomeTimeline
);

interface CommandDatabaseInsertTweet {
	type: CommandType.DATABASE_INSERT_TWEET;
	payload: {
		tweet: Tweet;
	};
}

interface CommandDatabaseUpdateTweet {
	type: CommandType.DATABASE_UPDATE_TWEET;
	payload: {
		tweet: Tweet;
	};
}

export type CommandDatabase = (
	| CommandDatabaseInsertTweet
	| CommandDatabaseUpdateTweet
);

export type Command = (
	| CommandTwitter
	| CommandDatabase
);
