import { test } from "node:test"
import Assert from "node:assert/strict"
import Fs from "node:fs"
import Path from "node:path"
import { fileURLToPath } from "node:url"
import { CleanWorks } from "../js/Data.js"
import { SharePage } from "../scripts/BuildSharePages.mjs"

const SiteRoot = Path.resolve(Path.dirname(fileURLToPath(import.meta.url)), "..")
const Works = CleanWorks(JSON.parse(Fs.readFileSync(Path.join(SiteRoot, "data", "Works.json"), "utf8")))
	.filter(function (Work) { return Work.Video !== null && Work.Poster !== null })

test("every clip has its own share link", function () {
	const Slugs = Works.map(function (Work) { return Work.Slug })
	Assert.equal(new Set(Slugs).size, Slugs.length)
	for (const Work of Works) {
		const Page = Fs.readFileSync(Path.join(SiteRoot, "works", Work.Slug, "index.html"), "utf8")
		Assert.ok(Page.includes("content=\"https://oasislua.site/" + Work.Video + "\""), Work.Slug + " points at its video")
		Assert.ok(Page.includes("url=/#works/" + Work.Slug + "\""), Work.Slug + " sends people to its clip")
	}
})

test("share pages embed the video for Discord", function () {
	const Page = SharePage({ Title: "A & B", Slug: "a-b", Category: "SFX", Game: "", Note: "note", Video: "media/Works/A.mp4", Poster: "media/Works/A.jpg" }, { Width: 1280, Height: 720 })
	Assert.ok(Page.includes("<meta property=\"og:type\" content=\"video.other\">"))
	Assert.ok(Page.includes("<meta property=\"og:video:type\" content=\"video/mp4\">"))
	Assert.ok(Page.includes("<meta property=\"og:video:width\" content=\"1280\">"))
	Assert.ok(Page.includes("<meta property=\"og:title\" content=\"A &amp; B\">"))
})
