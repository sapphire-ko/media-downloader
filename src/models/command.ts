import {
	Tweet,
} from '~/models';

export enum CommandType {
	TWITTER_HOME_TIMELINE = 100001,
	DATABASE_INSERT_TWEET = 200001,
	DATABASE_UPDATE_TWEET,
}

interface CommandTwitterHomeTimeline {
	type: CommandType.TWITTER_HOME_TIMELINE;
	payload: {
		since_id: string;
	};
}

export type CommandTwitter = (
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
