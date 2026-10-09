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
		const Response = await fetch(Path, { cache: "no-store" })
		if (!Response.ok) return null
		return await Response.json()
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

export function CleanSite(Payload) {
	const Source = IsObject(Payload) ? Payload : {}
	const Track = IsObject(Source.Track) ? Source.Track : {}

	return {
		DiscordUserId: /^[0-9]{5,25}$/.test(Text(Source.DiscordUserId)) ? Text(Source.DiscordUserId) : null,
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
