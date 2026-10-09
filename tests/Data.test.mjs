import { test } from "node:test"
import Assert from "node:assert/strict"
import { CleanGames, CleanWorks, CleanPosts, CleanArt, CleanStats, CleanSite } from "../js/Data.js"

const BadPayloads = [null, "text", {}, 42, []]

test("CleanGames drops nameless entries, stringifies ids and sorts by order", function () {
	const Games = CleanGames({
		Games: [
			{ Name: "B", PlaceId: 2, Order: 2, Status: "Live" },
			{ PlaceId: 9, Order: 0 },
			{ Name: "A", PlaceId: null, Order: 1, Status: "Weird" },
		],
	})
	Assert.deepEqual(Games.map(function (Game) { return Game.Name }), ["A", "B"])
	Assert.equal(Games[1].PlaceId, "2")
	Assert.equal(Games[0].PlaceId, null)
	Assert.equal(Games[0].Status, "InDevelopment")
	Assert.equal(Games[1].Status, "Live")
})

test("CleanWorks drops unknown categories and keeps missing posters as null", function () {
	const Works = CleanWorks({
		Works: [
			{ Title: "Song", Category: "Music", Video: "a.mp4" },
			{ Title: "Hit", Category: "SFX", Video: "b.mp4" },
		],
	})
	Assert.equal(Works.length, 1)
	Assert.equal(Works[0].Title, "Hit")
	Assert.equal(Works[0].Poster, null)
})

test("CleanPosts sorts newest first", function () {
	const Posts = CleanPosts({
		Posts: [
			{ Title: "Old", Date: "2026-01-01" },
			{ Title: "New", Date: "2026-10-09" },
		],
	})
	Assert.deepEqual(Posts.map(function (Post) { return Post.Title }), ["New", "Old"])
})

test("CleanArt drops pieces without an image and falls back to the image as thumb", function () {
	const Art = CleanArt({ Art: [{ Thumb: "a.jpg" }, { Image: "b.jpg" }, { Image: "c.jpg", Thumb: "c-Thumb.jpg" }] })
	Assert.deepEqual(Art, [{ Image: "b.jpg", Thumb: "b.jpg" }, { Image: "c.jpg", Thumb: "c-Thumb.jpg" }])
})

test("CleanStats gives zero totals for nothing", function () {
	const Stats = CleanStats(null)
	Assert.deepEqual(Stats.Totals, { Visits: 0, Favorites: 0, Playing: 0 })
	Assert.deepEqual(Stats.Games, {})
	Assert.equal(Stats.UpdatedAt, null)
})

test("CleanSite drops links that are not http", function () {
	const Site = CleanSite({
		Links: [
			{ Title: "Good", Url: "https://example.com" },
			{ Title: "Empty", Url: "" },
			{ Title: "Script", Url: "javascript:alert(1)" },
		],
	})
	Assert.deepEqual(Site.Links.map(function (Link) { return Link.Title }), ["Good"])
})

test("every cleaner survives bad payloads", function () {
	BadPayloads.forEach(function (Payload) {
		Assert.deepEqual(CleanGames(Payload), [])
		Assert.deepEqual(CleanWorks(Payload), [])
		Assert.deepEqual(CleanPosts(Payload), [])
		Assert.deepEqual(CleanArt(Payload), [])
		Assert.equal(CleanStats(Payload).Totals.Visits, 0)
		Assert.deepEqual(CleanSite(Payload).Links, [])
	})
})
