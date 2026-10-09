import { test as Base, expect } from "@playwright/test"

const LanyardReply = {
	success: true,
	data: {
		discord_status: "idle",
		discord_user: { id: "890630436840173579", username: "oasis", display_name: "oasis", avatar: null },
	},
}

const test = Base.extend({
	page: async function ({ page }, Use) {
		const Errors = []
		page.on("pageerror", function (PageError) { Errors.push(PageError.message) })
		await page.route("https://api.lanyard.rest/**", function (Route) {
			Route.fulfill({ json: LanyardReply })
		})
		await page.route("https://kaosbot.mosham.workers.dev/Visit", function (Route) {
			Route.fulfill({ json: { Count: 221 } })
		})
		await Use(page)
		expect(Errors).toEqual([])
	},
})

async function EnterMenu(Page) {
	await Page.goto("/")
	await expect(Page.locator(".TitlePrompt")).toBeVisible()
	await Page.keyboard.press("Space")
	await expect(Page.locator("#ScreenMain")).toBeVisible()
	await expect(Page.locator("#Title")).toBeHidden()
	await expect(Page.locator("#Wipe")).not.toHaveClass(/Run/)
}

async function OpenScreen(Page, Name) {
	await Page.goto("/#" + Name.toLowerCase())
	await expect(Page.locator("#Screen" + Name)).toBeVisible()
	await expect(Page.locator("body")).toHaveClass(/Ready/)
}

test.describe("shell", function () {
	test("title screen leads to the main menu with live totals", async function ({ page }) {
		await EnterMenu(page)
		await expect(page.locator(".MainTitle")).toHaveText("OASIS")
		await expect(page.locator(".MainStat").first()).toContainText("833.9M")
		await expect(page.locator(".MainStat").nth(2)).toContainText("10")
		await expect(page.locator("#PresenceLabel")).toHaveText("IDLE")
	})

	test("arrow keys and enter open a screen, escape returns", async function ({ page }) {
		await EnterMenu(page)
		await page.keyboard.press("ArrowDown")
		await expect(page.locator(".MenuItem.Active")).toContainText("Games")
		await page.keyboard.press("ArrowUp")
		await page.keyboard.press("Enter")
		await expect(page.locator("#ScreenWorks")).toBeVisible()
		await expect(page).toHaveURL(/#works$/)
		await page.keyboard.press("Escape")
		await expect(page.locator("#ScreenMain")).toBeVisible()
	})

	test("a hash link skips the title screen", async function ({ page }) {
		await OpenScreen(page, "Games")
		await expect(page.locator("#Title")).toBeHidden()
		await expect(page.locator("#BackButton")).toBeVisible()
	})

	test("unknown hashes land on the main menu", async function ({ page }) {
		await page.goto("/#foo")
	await expect(page.locator(".TitlePrompt")).toBeVisible()
		await page.keyboard.press("Enter")
		await expect(page.locator("#ScreenMain")).toBeVisible()
	})

	test("mashing keys never leaves two screens or a stuck router", async function ({ page }) {
		await EnterMenu(page)
		for (let I = 0; I < 20; I++) {
			await page.keyboard.press("Enter")
			await page.keyboard.press("Escape")
		}
		await page.waitForTimeout(800)
		await expect(page.locator(".Screen.Shown")).toHaveCount(1)
		await page.keyboard.press("Escape")
		await page.waitForTimeout(800)
		await expect(page.locator("#ScreenMain")).toBeVisible()
		const Before = await page.locator(".MenuItem.Active").textContent()
		await page.keyboard.press("ArrowDown")
		await expect(page.locator(".MenuItem.Active")).not.toHaveText(Before)
	})

	test("browser back returns to the menu", async function ({ page }) {
		await EnterMenu(page)
		await page.locator(".MenuItem", { hasText: "Contact" }).click()
		await expect(page.locator("#ScreenContact")).toBeVisible()
		await page.goBack()
		await expect(page.locator("#ScreenMain")).toBeVisible()
	})

	test("old site links still open the right screen", async function ({ page }) {
		await page.goto("/#Current")
		await expect(page.locator("#ScreenCommissions")).toBeVisible()
	})
})

test.describe("work clock", function () {
	test.use({ timezoneId: "America/New_York" })

	test("shows my time, the visitor's time, hours and status", async function ({ page }) {
		await page.clock.setFixedTime(new Date("2026-10-10T18:00:00Z"))
		await EnterMenu(page)
		await expect(page.locator(".ClockStatus")).toHaveText("WORKING NOW")
		await expect(page.locator(".ClockRow", { hasText: "MY TIME" }).locator("b")).toHaveText("7PM UK")
		await expect(page.locator(".ClockRow", { hasText: "YOUR TIME" }).locator("b")).toHaveText("2PM")
		await expect(page.locator(".ClockRow", { hasText: "WORK HOURS" }).locator("b")).toHaveText("SUN-FRI 6PM-1:30AM / SAT 6PM-12AM UK")
	})

	test("says when i am back while off", async function ({ page }) {
		await page.clock.setFixedTime(new Date("2026-10-14T11:00:00Z"))
		await EnterMenu(page)
		await expect(page.locator(".ClockStatus")).toHaveText("OFF, BACK 6PM UK")
	})
})

test.describe("visits", function () {
	test("counts a visit once per session and shows the total", async function ({ page }) {
		const Methods = []
		page.on("request", function (Request_) {
			if (Request_.url().endsWith("/Visit")) Methods.push(Request_.method())
		})
		await page.goto("/")
		await expect(page.locator("#HudVisits")).toHaveText("SITE VISITS 221")
		await page.reload()
		await expect(page.locator("#HudVisits")).toHaveText("SITE VISITS 221")
		expect(Methods).toEqual(["POST", "GET"])
	})

	test("a failing counter just hides the line", async function ({ page }) {
		await page.route("https://kaosbot.mosham.workers.dev/Visit", function (Route) { Route.abort() })
		await EnterMenu(page)
		await expect(page.locator("#HudVisits")).toBeHidden()
	})
})

test.describe("player", function () {
	test("shows the track after starting", async function ({ page }) {
		await EnterMenu(page)
		await expect(page.locator(".PlayerTitle")).toHaveText("Better Days")
		await expect(page.locator(".PlayerArtist")).toHaveText("NEIKED x Mae Muller x Polo G")
	})

	test("a missing track leaves the site working and the player paused", async function ({ page }) {
		await page.route("**/BetterDays.mp3", function (Route) { Route.abort() })
		await EnterMenu(page)
		await page.keyboard.press("Enter")
		await expect(page.locator("#ScreenWorks")).toBeVisible()
		await expect(page.locator(".PlayerToggle")).toHaveAttribute("aria-label", "play music")
	})

	test("all six menu sounds load", async function ({ page }) {
		const Loaded = []
		page.on("response", function (Reply) {
			if (Reply.url().includes("/media/Audio/Ui/") && Reply.ok()) Loaded.push(Reply.url())
		})
		await EnterMenu(page)
		await expect.poll(function () { return Loaded.length }).toBe(6)
	})

	test("link previews point at the preview card", async function ({ page }) {
		await page.goto("/")
		await expect(page.locator("meta[property='og:image']")).toHaveAttribute("content", "https://oasislua.site/media/Preview.jpg")
		await expect(page.locator("meta[name='twitter:card']")).toHaveAttribute("content", "summary_large_image")
		const Preview = await page.request.get("/media/Preview.jpg")
		expect(Preview.ok()).toBe(true)
	})

	test("volume is remembered", async function ({ page }) {
		await EnterMenu(page)
		await page.locator(".PlayerVolume").fill("80")
		await page.reload()
		await expect(page.locator(".PlayerVolume")).toHaveValue("80")
	})
})

test.describe("works", function () {
	test("tabs filter the clips", async function ({ page }) {
		await OpenScreen(page, "Works")
		await expect(page.locator(".WorkTile")).toHaveCount(17)
		await page.locator(".Tab", { hasText: "SFX" }).click()
		await expect(page.locator(".WorkTile")).toHaveCount(12)
	})

	test("the viewer opens a clip and escape closes it before leaving", async function ({ page }) {
		await OpenScreen(page, "Works")
		await page.locator(".WorkTile").first().click()
		await expect(page.locator("#ScreenWorks .Viewer")).toBeVisible()
		await expect(page.locator("#ScreenWorks .ViewerTitle")).toHaveText("Stylised Flashstep")
		await expect(page.locator("#ScreenWorks .ViewerMedia video")).toHaveAttribute("src", /StylisedFlashstepSfx\.mp4$/)
		await page.keyboard.press("Escape")
		await expect(page.locator("#ScreenWorks .Viewer")).toBeHidden()
		await expect(page.locator("#ScreenWorks")).toBeVisible()
		await page.keyboard.press("Escape")
		await expect(page.locator("#ScreenMain")).toBeVisible()
	})

	test("a missing works file shows the empty state and other screens still work", async function ({ page }) {
		await page.route("**/data/Works.json", function (Route) { Route.fulfill({ status: 404, body: "" }) })
		await OpenScreen(page, "Works")
		await expect(page.locator("#ScreenWorks .Empty")).toHaveText("nothing here yet")
		await page.keyboard.press("Escape")
		await page.waitForTimeout(700)
		await page.keyboard.press("ArrowDown")
		await page.keyboard.press("Enter")
		await expect(page.locator("#ScreenGames")).toBeVisible()
	})
})

test.describe("art", function () {
	test("shows the personal pieces with the not for commission note", async function ({ page }) {
		await OpenScreen(page, "Art")
		await expect(page.locator("#ScreenArt .Quote")).toContainText("i don't take art commissions")
		await expect(page.locator(".ArtTile")).toHaveCount(3)
		await page.locator(".ArtTile").first().click()
		await expect(page.locator("#ScreenArt .Viewer")).toBeVisible()
		await expect(page.locator("#ScreenArt .ViewerMedia img")).toHaveAttribute("src", "media/Art/Art01.jpg")
		await expect(page.locator("#ScreenArt .ViewerNote")).toHaveText("not for commission.")
		await page.keyboard.press("Escape")
		await expect(page.locator("#ScreenArt .Viewer")).toBeHidden()
		await page.keyboard.press("Escape")
		await expect(page.locator("#ScreenMain")).toBeVisible()
	})

	test("the menu lists art between games and commissions", async function ({ page }) {
		await EnterMenu(page)
		await expect(page.locator(".MenuItem")).toHaveCount(6)
		await page.locator(".MenuItem", { hasText: "Art" }).click()
		await expect(page.locator("#ScreenArt")).toBeVisible()
		await expect(page).toHaveURL(/#art$/)
	})
})

test.describe("games", function () {
	test("lists games in order with live stats and play links", async function ({ page }) {
		await OpenScreen(page, "Games")
		await expect(page.locator(".GameItem")).toHaveText([
			"Type Soul", "Blades of Chance", "Brat Duels", "VEYTH", "Vania", "Steel Velocity", "Seraphs", "Multi Mayhem",
			"Calamity", "Anime Verse",
		])
		await expect(page.locator(".GameStats")).toContainText("818.7M")
		await expect(page.locator(".GamePlay")).toHaveAttribute("href", "https://www.roblox.com/games/14067600077")
	})

	test("contributions sit under their own label with a discord link", async function ({ page }) {
		await OpenScreen(page, "Games")
		await expect(page.locator(".GameGroup")).toHaveText("CONTRIBUTED TO")
		await page.locator(".GameItem", { hasText: "Calamity" }).click()
		await expect(page.locator(".GameTag")).toHaveText("CONTRIBUTION")
		await expect(page.locator(".GameLink")).toHaveAttribute("href", "https://discord.gg/6KV6gMxdp")
		await expect(page.locator(".GamePlay:not(.GameLink)")).toHaveCount(0)
	})

	test("unreleased games show in development with no stats", async function ({ page }) {
		await OpenScreen(page, "Games")
		await page.locator(".GameItem", { hasText: "VEYTH" }).click()
		await expect(page.locator(".GameTag")).toHaveText("IN DEVELOPMENT")
		await expect(page.locator(".GameStats")).toHaveCount(0)
		await expect(page.locator(".GamePlay")).toHaveCount(0)
	})
})

test.describe("commissions", function () {
	test("rates and payment render with no board", async function ({ page }) {
		await OpenScreen(page, "Commissions")
		await expect(page.locator("#ScreenCommissions .Tab")).toHaveText(["RATES", "PAYMENT", "REQUEST"])
		await expect(page.locator(".Tier")).toHaveCount(9)
		await expect(page.locator(".TierPrice")).toHaveText(["$22", "$45", "$110", "$150", "$190", "$10", "$5", "$15", "$20"])
		await page.keyboard.press("ArrowRight")
		await expect(page.locator(".Currency")).toHaveCount(3)
		await expect(page.locator(".PayPal")).toHaveAttribute("href", "https://paypal.me/oasis098")
		await expect(page.locator(".Terms li")).toHaveCount(7)
	})
})

test.describe("request form", function () {
	const WorkerUrl = "https://kaosbot.mosham.workers.dev/Commission"

	async function OpenRequest(Page) {
		await OpenScreen(Page, "Commissions")
		await Page.locator(".Tab", { hasText: "REQUEST" }).click()
		await expect(Page.locator(".RequestForm")).toBeVisible()
	}

	async function PickAbilities(Page, Count) {
		await Page.locator(".PickChip", { hasText: "SFX" }).click()
		const Plus = Page.locator(".PickRow", { hasText: "Abilities" }).locator(".StepButton", { hasText: "+" })
		for (let I = 0; I < Count; I++) {
			await Plus.click()
		}
	}

	async function FillBasics(Page) {
		await Page.locator("input[name='Discord']").fill("oasis")
		await PickAbilities(Page, 5)
		await Page.locator("textarea[name='Details']").fill("five ability sounds for a combat kit")
	}

	test("the estimate adds up the picked items and rush", async function ({ page }) {
		await OpenRequest(page)
		await expect(page.locator(".EstimateTotal")).toHaveText("from $0")
		await PickAbilities(page, 5)
		await expect(page.locator(".EstimateLines li")).toHaveText(["5 x Abilities SFX$75"])
		await expect(page.locator(".EstimateTotal")).toHaveText("from $75")
		await page.locator(".EstimateRush").click()
		await expect(page.locator(".EstimateTotal")).toHaveText("from $93.75")
	})

	test("sends the order, estimate and files to mosham, then clears", async function ({ page }) {
		let Posted = null
		await page.route(WorkerUrl, async function (Route) {
			Posted = Route.request().postData()
			await Route.fulfill({ json: { Accepted: true } })
		})
		await OpenRequest(page)
		await FillBasics(page)
		await page.locator(".DropInput").setInputFiles({ name: "ref.png", mimeType: "image/png", buffer: Buffer.alloc(64) })
		await expect(page.locator(".FileChip")).toHaveText(["ref.png (1 KB)x"])
		await page.locator(".FormSend").click()
		await expect(page.locator(".FormStatus")).toHaveText("sent! i'll message you on discord soon.")
		expect(Posted).toContain("name=\"Discord\"\r\n\r\noasis")
		expect(Posted).toContain("name=\"Kinds\"\r\n\r\nSFX")
		expect(Posted).toContain("name=\"Order\"\r\n\r\n5 x Abilities SFX $75")
		expect(Posted).toContain("name=\"Estimate\"\r\n\r\nfrom $75")
		expect(Posted).toContain("filename=\"ref.png\"")
		await expect(page.locator("input[name='Discord']")).toHaveValue("")
		await expect(page.locator(".EstimateTotal")).toHaveText("from $0")
		await expect(page.locator(".FileChip")).toHaveCount(0)
	})

	test("a removed file is not sent", async function ({ page }) {
		let Posted = null
		await page.route(WorkerUrl, async function (Route) {
			Posted = Route.request().postData()
			await Route.fulfill({ json: { Accepted: true } })
		})
		await OpenRequest(page)
		await FillBasics(page)
		await page.locator(".DropInput").setInputFiles([
			{ name: "keep.png", mimeType: "image/png", buffer: Buffer.alloc(8) },
			{ name: "drop.png", mimeType: "image/png", buffer: Buffer.alloc(8) },
		])
		await page.locator(".FileChip", { hasText: "drop.png" }).locator(".FileRemove").click()
		await page.locator(".FormSend").click()
		await expect(page.locator(".FormStatus")).toHaveText("sent! i'll message you on discord soon.")
		expect(Posted).toContain("filename=\"keep.png\"")
		expect(Posted).not.toContain("filename=\"drop.png\"")
	})

	test("shows the reason mosham gives when it refuses", async function ({ page }) {
		await page.route(WorkerUrl, function (Route) {
			Route.fulfill({ status: 400, json: { Accepted: false, Reason: "Tell me a bit more about what you need" } })
		})
		await OpenRequest(page)
		await FillBasics(page)
		await page.locator(".FormSend").click()
		await expect(page.locator(".FormStatus")).toHaveText("Tell me a bit more about what you need")
	})

	test("needs something picked before sending", async function ({ page }) {
		let Calls = 0
		await page.route(WorkerUrl, function (Route) {
			Calls += 1
			Route.fulfill({ json: { Accepted: true } })
		})
		await OpenRequest(page)
		await page.locator("input[name='Discord']").fill("oasis")
		await page.locator(".FormSend").click()
		await expect(page.locator(".FormStatus")).toHaveText("pick at least one thing you need, or tick other.")
		expect(Calls).toBe(0)
	})

	test("blocks too many or too big attachments before sending", async function ({ page }) {
		let Calls = 0
		await page.route(WorkerUrl, function (Route) {
			Calls += 1
			Route.fulfill({ json: { Accepted: true } })
		})
		await OpenRequest(page)
		await FillBasics(page)
		const Files = Array.from({ length: 11 }, function (_, I) {
			return { name: "ref" + I + ".png", mimeType: "image/png", buffer: Buffer.alloc(8) }
		})
		await page.locator(".DropInput").setInputFiles(Files)
		await page.locator(".FormSend").click()
		await expect(page.locator(".FormStatus")).toHaveText("attach 10 files or fewer.")
		await page.locator(".FileChip").first().locator(".FileRemove").click()
		await page.locator(".FileChip").first().locator(".FileRemove").click()
		await page.locator(".DropInput").setInputFiles({ name: "huge.mp4", mimeType: "video/mp4", buffer: Buffer.alloc(21000000) })
		await page.locator(".FormSend").click()
		await expect(page.locator(".FormStatus")).toHaveText("huge.mp4 is over 20 MB. paste a link to it instead.")
		expect(Calls).toBe(0)
	})

	test("typed input survives switching tabs", async function ({ page }) {
		await OpenRequest(page)
		await page.locator("input[name='Discord']").fill("oasis")
		await page.locator(".Tab", { hasText: "RATES" }).click()
		await page.locator(".Tab", { hasText: "REQUEST" }).click()
		await expect(page.locator("input[name='Discord']")).toHaveValue("oasis")
	})
})

test.describe("latest and contact", function () {
	test("latest shows newest first with short dates", async function ({ page }) {
		await OpenScreen(page, "Latest")
		await expect(page.locator(".PostDate").first()).toHaveText("10/09")
	})

	test("contact hides empty links and opens the rest in a new tab", async function ({ page }) {
		await OpenScreen(page, "Contact")
		await expect(page.locator(".LinkRow")).toHaveCount(3)
		await expect(page.locator(".LinkRow").first()).toContainText("Discord")
		for (const Row of await page.locator(".LinkRow").all()) {
			await expect(Row).toHaveAttribute("target", "_blank")
			await expect(Row).toHaveAttribute("rel", "noopener noreferrer")
		}
	})
})

test.describe("phones and motion", function () {
	test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

	test("tapping works end to end with no sideways scroll", async function ({ page }) {
		await page.goto("/")
		await expect(page.locator(".TitlePrompt")).toBeVisible()
		await page.locator("#Title").tap()
		await expect(page.locator("#ScreenMain")).toBeVisible()
		await expect(page.locator("#Wipe")).not.toHaveClass(/Run/)
		await page.locator(".MenuItem", { hasText: "Games" }).tap()
		await expect(page.locator("#ScreenGames")).toBeVisible()
		const Overflow = await page.evaluate(function () {
			return document.documentElement.scrollWidth - window.innerWidth
		})
		expect(Overflow).toBeLessThanOrEqual(0)
		await page.locator("#BackButton").tap()
		await expect(page.locator("#ScreenMain")).toBeVisible()
	})
})

test.describe("reduced motion", function () {
	test.use({ reducedMotion: "reduce" })

	test("screen changes are near instant", async function ({ page }) {
		await EnterMenu(page)
		await page.keyboard.press("Enter")
		await expect(page.locator("#ScreenWorks")).toBeVisible({ timeout: 150 })
	})
})
