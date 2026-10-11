import { ParseClock } from "./WorkClock.js"
import { SlugFor } from "./Format.js"

const WorkCategories = ["SFX", "VFX", "UI", "Scripting"]
const GameStatuses = ["Live", "InDevelopment", "Contribution"]

function IsObject(Value) {
	return Value !== null && typeof Value === "object" && !Array.isArray(Value)
}

function ListFrom(Payload, Key) {
	if (Array.isArray(Payload)) return Payload.filter(IsObject)
	if (IsObject(Payload) && Array.isArray(Payload[Key])) return Payload[Key].filter(IsObject)
	return []
}

function Text(Value) {
	return Value === null || Value === undefined ? "" : String(Value)
}

function OptionalText(Value) {
	const Cleaned = Text(Value).trim()
	return Cleaned === "" ? null : Cleaned
}

function Count(Value) {
	const Parsed = Number(Value)
	return Number.isFinite(Parsed) && Parsed > 0 ? Math.floor(Parsed) : 0
}

function IsWebUrl(Value) {
	return /^https?:\/\//i.test(Text(Value))
}

export async function LoadJson(Path) {
	try {
		const Reply = await fetch(Path, { cache: "no-store" })
		if (!Reply.ok) return null
		return await Reply.json()
	} catch {
		return null
	}
}

export function CleanGames(Payload) {
	return ListFrom(Payload, "Games")
		.filter(function (Game) { return Text(Game.Name).trim() !== "" })
		.map(function (Game) {
			return {
				Name: Text(Game.Name),
				PlaceId: OptionalText(Game.PlaceId),
				Role: Text(Game.Role),
				Blurb: Text(Game.Blurb),
				Thumb: OptionalText(Game.Thumb),
				Link: IsWebUrl(Game.Link) ? Text(Game.Link) : null,
				Status: GameStatuses.includes(Game.Status) ? Game.Status : "InDevelopment",
				Order: Number.isFinite(Number(Game.Order)) ? Number(Game.Order) : 0,
			}
		})
		.sort(function (First, Second) { return First.Order - Second.Order })
}

export function CleanWorks(Payload) {
	return ListFrom(Payload, "Works")
		.filter(function (Work) { return WorkCategories.includes(Work.Category) })
		.map(function (Work) {
			return {
				Title: Text(Work.Title),
				Slug: SlugFor(Work.Title),
				Pinned: Work.Pinned === true,
				Category: Work.Category,
				Game: Text(Work.Game),
				Video: OptionalText(Work.Video),
				Poster: OptionalText(Work.Poster),
				Note: Text(Work.Note),
				Date: Text(Work.Date),
			}
		})
		.filter(function (Work) { return Work.Video !== null || Work.Poster !== null })
}

export function CleanPosts(Payload) {
	return ListFrom(Payload, "Posts")
		.map(function (Post) {
			return {
				Title: Text(Post.Title),
				Text: Text(Post.Text),
				Link: IsWebUrl(Post.Link) ? Text(Post.Link) : null,
				Date: Text(Post.Date),
			}
		})
		.sort(function (First, Second) { return Second.Date.localeCompare(First.Date) })
}

function CleanGameStats(Value) {
	const Source = IsObject(Value) ? Value : {}
	return { Visits: Count(Source.Visits), Favorites: Count(Source.Favorites), Playing: Count(Source.Playing) }
}

export function CleanArt(Payload) {
	return ListFrom(Payload, "Art")
		.filter(function (Piece) { return OptionalText(Piece.Image) !== null })
		.map(function (Piece) {
			const Thumb = OptionalText(Piece.Thumb)
			return { Image: Text(Piece.Image), Thumb: Thumb !== null ? Thumb : Text(Piece.Image) }
		})
}

function CleanTier(Tier) {
	return {
		Name: Text(Tier.Name),
		Price: Count(Tier.Price),
		Scope: Text(Tier.Scope),
		Note: Text(Tier.Note),
	}
}

export function CleanRates(Payload) {
	const Source = IsObject(Payload) ? Payload : {}
	return {
		RushPercent: Count(Source.RushPercent),
		Groups: ListFrom(Source.Groups, "Groups")
			.filter(function (Group) { return WorkCategories.includes(Group.Kind) })
			.map(function (Group) {
				return {
					Title: Text(Group.Title),
					Kind: Group.Kind,
					Detail: Text(Group.Detail),
					Tiers: ListFrom(Group.Tiers, "Tiers")
						.filter(function (Tier) { return Text(Tier.Name).trim() !== "" })
						.map(CleanTier),
				}
			}),
	}
}

export function CleanStats(Payload) {
	const Source = IsObject(Payload) ? Payload : {}
	const Games = {}
	if (IsObject(Source.Games)) {
		Object.keys(Source.Games).forEach(function (PlaceId) {
			Games[PlaceId] = CleanGameStats(Source.Games[PlaceId])
		})
	}

	return {
		UpdatedAt: OptionalText(Source.UpdatedAt),
		Totals: CleanGameStats(Source.Totals),
		Games: Games,
	}
}

function IsTimeZone(Value) {
	try {
		new Intl.DateTimeFormat("en-GB", { timeZone: Text(Value) })
		return Text(Value) !== ""
	} catch {
		return false
	}
}

function CleanWorkHours(Payload) {
	return ListFrom(Payload, "WorkHours")
		.map(function (Block) {
			const Days = Array.isArray(Block.Days) ? Block.Days.filter(function (Day) { return Number.isInteger(Day) && Day >= 0 && Day <= 6 }) : []
			return { Days: Days, Start: ParseClock(Block.Start), End: ParseClock(Block.End) }
		})
		.filter(function (Block) { return Block.Days.length > 0 && Block.Start !== null && Block.End !== null })
}

export function CleanSite(Payload) {
	const Source = IsObject(Payload) ? Payload : {}
	const Track = IsObject(Source.Track) ? Source.Track : {}

	return {
		DiscordUserId: /^[0-9]{5,25}$/.test(Text(Source.DiscordUserId)) ? Text(Source.DiscordUserId) : null,
		CommissionUrl: IsWebUrl(Source.CommissionUrl) ? Text(Source.CommissionUrl) : null,
		VisitsUrl: IsWebUrl(Source.VisitsUrl) ? Text(Source.VisitsUrl) : null,
		TimeZone: IsTimeZone(Source.TimeZone) ? Text(Source.TimeZone) : null,
		TimeZoneLabel: Text(Source.TimeZoneLabel),
		WorkHours: CleanWorkHours(Source.WorkHours),
		Links: ListFrom(Source.Links, "Links")
			.filter(function (Link) { return IsWebUrl(Link.Url) })
			.map(function (Link) {
				return { Title: Text(Link.Title), Subtitle: Text(Link.Subtitle), Url: Text(Link.Url) }
			}),
		Track: {
			Title: Text(Track.Title),
			Artist: Text(Track.Artist),
			File: OptionalText(Track.File),
		},
	}
}
