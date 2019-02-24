import {
	Twitter,
} from 'twit';

export enum TwitterMediumType {
	PHOTO = 'photo',
	VIDEO = 'video',
}

interface TwitterMediumPhoto {
	type: TwitterMediumType.PHOTO;
}

interface TwitterMediumVideo {
	type: TwitterMediumType.VIDEO;
	video_info: {
		variants: Array<{
			bitrate: number;
			content_type: string;
			url: string;
		}>;
	};
}

type TwitterMedium = (
	| TwitterMediumPhoto
	| TwitterMediumVideo
);

export type AccountTwitter = Twitter.User;
export type Tweet = Twitter.Status & {
	extended_entities?: {
		media: Array<Twitter.MediaEntity & TwitterMedium>;
	};
};

interface LimitStatus {
	limit: number;
	remaining: number;
	reset: number;
}

export interface RateLimitStatus {
	rate_limit_context: {
		access_token: string;
	};
	resources: {
		lists: {
			'/lists/list': LimitStatus;
			'/lists/memberships': LimitStatus;
			'/lists/subscribers/show': LimitStatus;
			'/lists/members': LimitStatus;
			'/lists/subscriptions': LimitStatus;
			'/lists/show': LimitStatus;
			'/lists/ownerships': LimitStatus;
			'/lists/subscribers': LimitStatus;
			'/lists/members/show': LimitStatus;
			'/lists/statuses': LimitStatus;
		};
		application: {
			'/application/rate_limit_status': LimitStatus;
		};
		mutes: {
			'/mutes/keywords/create': LimitStatus;
			'/mutes/advanced_filters': LimitStatus;
			'/mutes/keywords/destroy': LimitStatus;
			'/mutes/keywords/discouraged': LimitStatus;
			'/mutes/users/list': LimitStatus;
			'/mutes/users/ids': LimitStatus;
			'/mutes/keywords/list': LimitStatus;
		};
		friendships: {
			'/friendships/outgoing': LimitStatus;
			'/friendships/create': LimitStatus;
			'/friendships/list': LimitStatus;
			'/friendships/no_retweets/ids': LimitStatus;
			'/friendships/lookup': LimitStatus;
			'/friendships/incoming': LimitStatus;
			'/friendships/show': LimitStatus;
		};
		users: {
			'/users/wipe_addressbook': LimitStatus;
			'/users/interests/timelines': LimitStatus;
			'/users/phone_number_available': LimitStatus;
			'/users/contributors': LimitStatus;
			'/users/contributees': LimitStatus;
			'/users/report_spam': LimitStatus;
			'/users/contributors/pending': LimitStatus;
			'/users/send_invites_by_email': LimitStatus;
			'/users/show/:id': LimitStatus;
			'/users/search': LimitStatus;
			'/users/interests/topics': LimitStatus;
			'/users/suggestions/:slug': LimitStatus;
			'/users/recommendations': LimitStatus;
			'/users/contributees/pending': LimitStatus;
			'/users/profile_banner': LimitStatus;
			'/users/derived_info': LimitStatus;
			'/users/email_phone_info': LimitStatus;
			'/users/suggestions/:slug/members': LimitStatus;
			'/users/following_followers_of': LimitStatus;
			'/users/lookup': LimitStatus;
			'/users/suggestions': LimitStatus;
			'/users/extended_profile': LimitStatus;
			'/users/reverse_lookup': LimitStatus;
		};
		followers: {
			'/followers/ids': LimitStatus;
			'/followers/vit/ids': LimitStatus;
			'/followers/vit/list': LimitStatus;
			'/followers/list': LimitStatus;
		};
		statuses: {
			'/statuses/retweeters/ids': LimitStatus;
			'/statuses/favorited_by': LimitStatus;
			'/statuses/retweets_of_me': LimitStatus;
			'/statuses/show/:id': LimitStatus;
			'/statuses/home_timeline': LimitStatus;
			'/statuses/user_timeline': LimitStatus;
			'/statuses/friends': LimitStatus;
			'/statuses/retweets/:id': LimitStatus;
			'/statuses/:id/activity/summary': LimitStatus;
			'/statuses/mentions_timeline': LimitStatus;
			'/statuses/oembed': LimitStatus;
			'/statuses/lookup': LimitStatus;
			'/statuses/media_timeline': LimitStatus;
			'/statuses/following_timeline': LimitStatus;
			'/statuses/retweeted_by': LimitStatus;
		};
		friends: {
			'/friends/vit/ids': LimitStatus;
			'/friends/following/ids': LimitStatus;
			'/friends/following/list': LimitStatus;
			'/friends/list': LimitStatus;
			'/friends/vit/list': LimitStatus;
			'/friends/ids': LimitStatus;
		};
	};
}
