import Fs from "node:fs/promises"
import Path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { CleanGames, CleanStats } from "../js/Data.js"

const UniverseUrl = "https://apis.roblox.com/universes/v1/places/{PlaceId}/universe"
const GamesUrl = "https://games.roblox.com/v1/games?universeIds="
const LiveStatsUrl = "https://oasislua.site/data/Stats.json"
const SiteRoot = Path.resolve(Path.dirname(fileURLToPath(import.meta.url)), "..")

async function ReadJson(FetchImpl, Url) {
	try {
		const Response = await FetchImpl(Url)
		if (!Response.ok) return null
		return await Response.json()
	} catch {
		return null
	}
}

async function UniverseFor(FetchImpl, PlaceId) {
	const Body = await ReadJson(FetchImpl, UniverseUrl.replace("{PlaceId}", PlaceId))
	return Body && Number.isFinite(Body.universeId) ? Body.universeId : null
}

function SumTotals(Games) {
	return Object.values(Games).reduce(function (Totals, Game) {
		return {
			Visits: Totals.Visits + Game.Visits,
			Favorites: Totals.Favorites + Game.Favorites,
			Playing: Totals.Playing + Game.Playing,
		}
	}, { Visits: 0, Favorites: 0, Playing: 0 })
}

export async function FetchStats(PlaceIds, FetchImpl, Previous) {
	const PreviousStats = CleanStats(Previous)
	const Universes = await Promise.all(PlaceIds.map(function (PlaceId) {
		return UniverseFor(FetchImpl, PlaceId)
	}))

	const KnownUniverses = Universes.filter(function (Universe) { return Universe !== null })
	const Body = KnownUniverses.length > 0 ? await ReadJson(FetchImpl, GamesUrl + KnownUniverses.join(",")) : null
	const LiveByUniverse = new Map((Body && Array.isArray(Body.data) ? Body.data : []).map(function (Game) {
		return [Game.id, Game]
	}))

	const Games = {}
	PlaceIds.forEach(function (PlaceId, Index) {
		const Live = LiveByUniverse.get(Universes[Index])
		if (Live) {
			Games[PlaceId] = CleanStats({
				Totals: { Visits: Live.visits, Favorites: Live.favoritedCount, Playing: Live.playing },
			}).Totals
			return
		}
		if (PreviousStats.Games[PlaceId]) Games[PlaceId] = PreviousStats.Games[PlaceId]
	})

	return { UpdatedAt: new Date().toISOString(), Totals: SumTotals(Games), Games: Games }
}

async function ReadPrevious() {
	const Live = await ReadJson(fetch, LiveStatsUrl)
	if (Live) return Live

	try {
		return JSON.parse(await Fs.readFile(Path.join(SiteRoot, "data", "Stats.json"), "utf8"))
	} catch {
		return null
	}
}

async function Main(OutputPath) {
	const GamesFile = JSON.parse(await Fs.readFile(Path.join(SiteRoot, "data", "Games.json"), "utf8"))
	const PlaceIds = CleanGames(GamesFile)
		.map(function (Game) { return Game.PlaceId })
		.filter(function (PlaceId) { return PlaceId !== null })

	const Stats = await FetchStats(PlaceIds, fetch, await ReadPrevious())
	await Fs.writeFile(OutputPath, JSON.stringify(Stats, null, "\t") + "\n")
	console.log("Stats written: " + Stats.Totals.Visits + " visits across " + Object.keys(Stats.Games).length + " games")
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	await Main(process.argv[2] || Path.join(SiteRoot, "data", "Stats.json"))
}
