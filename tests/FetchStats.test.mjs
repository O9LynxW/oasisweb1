import { test } from "node:test"
import Assert from "node:assert/strict"
import { FetchStats } from "../scripts/FetchStats.mjs"

const Universes = { "1": 101, "2": 202 }
const LiveGames = [
	{ id: 101, visits: 1000, favoritedCount: 50, playing: 5 },
	{ id: 202, visits: 300, favoritedCount: 7, playing: 1 },
]
const Previous = {
	UpdatedAt: "2026-01-01T00:00:00.000Z",
	Totals: { Visits: 999, Favorites: 9, Playing: 9 },
	Games: {
		"1": { Visits: 900, Favorites: 40, Playing: 2 },
		"2": { Visits: 250, Favorites: 6, Playing: 0 },
		"3": { Visits: 77, Favorites: 7, Playing: 7 },
	},
}

function Reply(Status, Body) {
	return { ok: Status === 200, status: Status, json: async function () { return Body } }
}

function FakeFetch(Overrides) {
	return async function (Url) {
		const Override = Overrides && Overrides(Url)
		if (Override) return Override()

		const UniverseMatch = /places\/(\d+)\/universe/.exec(Url)
		if (UniverseMatch) return Reply(200, { universeId: Universes[UniverseMatch[1]] })

		const Ids = /universeIds=([\d,]+)/.exec(Url)[1].split(",").map(Number)
		return Reply(200, { data: LiveGames.filter(function (Game) { return Ids.includes(Game.id) }) })
	}
}

test("sums live stats into totals", async function () {
	const Stats = await FetchStats(["1", "2"], FakeFetch(), Previous)
	Assert.deepEqual(Stats.Games["1"], { Visits: 1000, Favorites: 50, Playing: 5 })
	Assert.deepEqual(Stats.Totals, { Visits: 1300, Favorites: 57, Playing: 6 })
	Assert.notEqual(Stats.UpdatedAt, Previous.UpdatedAt)
})

test("a failed universe lookup keeps that game's previous numbers", async function () {
	const Stats = await FetchStats(["1", "2"], FakeFetch(function (Url) {
		if (Url.includes("places/2/")) return function () { return Reply(404, {}) }
	}), Previous)
	Assert.deepEqual(Stats.Games["2"], Previous.Games["2"])
	Assert.deepEqual(Stats.Games["1"], { Visits: 1000, Favorites: 50, Playing: 5 })
	Assert.equal(Stats.Totals.Visits, 1250)
})

test("a thrown games request keeps every previous number", async function () {
	const Stats = await FetchStats(["1", "2"], FakeFetch(function (Url) {
		if (Url.includes("universeIds")) return function () { throw new TypeError("network down") }
	}), Previous)
	Assert.deepEqual(Stats.Games["1"], Previous.Games["1"])
	Assert.deepEqual(Stats.Games["2"], Previous.Games["2"])
	Assert.equal(Stats.Totals.Visits, 1150)
})

test("games no longer listed are dropped", async function () {
	const Stats = await FetchStats(["1", "2"], FakeFetch(), Previous)
	Assert.equal(Stats.Games["3"], undefined)
})
