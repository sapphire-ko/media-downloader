export enum CommandType {
	TWITTER_RATE_LIMIT_STATUS = 100001,
	TWITTER_FOLLOWING_IDS,
	TWITTER_HOME_TIMELINE,
	DATABASE_INSERT_ACCOUNT = 200001,
	DATABASE_UPDATE_ACCOUNT,
	DATABASE_INSERT_TWEET,
	DATABASE_UPDATE_TWEET,
}

interface CommandTwitterRateLimitStatus {
	type: CommandType.TWITTER_RATE_LIMIT_STATUS;
}

interface CommandTwitterFollowingIDs {
	type: CommandType.TWITTER_FOLLOWING_IDS;
}

interface CommandTwitterHomeTimeline {
	type: CommandType.TWITTER_HOME_TIMELINE;
	payload: {
		since_id: string;
	};
}

export type CommandTwitter = (
	| CommandTwitterRateLimitStatus
	| CommandTwitterFollowingIDs
	| CommandTwitterHomeTimeline
);

export interface CommandDatabaseInsertAccount {
	type: CommandType.DATABASE_INSERT_ACCOUNT;
	payload: {
		id: string;
	};
}

export interface CommandDatabaseUpdateAccount {
	type: CommandType.DATABASE_UPDATE_ACCOUNT;
	payload: {
		id: string;
	};
}

export interface CommandDatabaseInsertTweet {
	type: CommandType.DATABASE_INSERT_TWEET;
	payload: {
		id: string;
		hasMedia: boolean;
	};
}

export interface CommandDatabaseUpdateTweet {
	type: CommandType.DATABASE_UPDATE_TWEET;
	payload: {
		id: string;
		downloaded: boolean;
	};
}

export type CommandDatabase = (
	| CommandDatabaseInsertAccount
	| CommandDatabaseUpdateAccount
	| CommandDatabaseInsertTweet
	| CommandDatabaseUpdateTweet
);

export type Command = (
	| CommandTwitter
	| CommandDatabase
);
