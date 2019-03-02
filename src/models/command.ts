import {
	Tweet,
} from '~/models';

export enum CommandType {
	TWITTER_RATE_LIMIT_STATUS = 100001,
	TWITTER_FOLLOWING_IDS,
	TWITTER_HOME_TIMELINE,
	DATABASE_INSERT_ACCOUNT = 200001,
	DATABASE_INSERT_TWEET,
	DATABASE_INSERT_MEDIUM,
	DOWNLOADER_DOWNLOAD_MEDIA = 300001,
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

export interface CommandDatabaseInsertTweet {
	type: CommandType.DATABASE_INSERT_TWEET;
	payload: {
		tweet: Tweet;
	};
}

export interface CommandDatabaseInsertMedium {
	type: CommandType.DATABASE_INSERT_MEDIUM;
	payload: {
		id: string;
		url: string;
		accountId: string;
		tweetId: string;
	};
}

export type CommandDatabase = (
	| CommandDatabaseInsertAccount
	| CommandDatabaseInsertTweet
	| CommandDatabaseInsertMedium
);

interface CommandDownloaderDownloadMedia {
	type: CommandType.DOWNLOADER_DOWNLOAD_MEDIA;
}

export type CommandDownloader = (
	| CommandDownloaderDownloadMedia
);

export type Command = (
	| CommandTwitter
	| CommandDatabase
	| CommandDownloader
);
