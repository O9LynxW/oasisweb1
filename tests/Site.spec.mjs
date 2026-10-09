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
		await expect(page.locator(".MainName h1")).toHaveText("OASIS")
		await expect(page.locator(".MainStat").first()).toContainText("833.9M")
		await expect(page.locator(".MainStat").nth(2)).toContainText("8")
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
		await expect(page.locator(".WorkTile")).toHaveCount(13)
		await page.locator(".Tab", { hasText: "SFX" }).click()
		await expect(page.locator(".WorkTile")).toHaveCount(7)
	})

	test("the viewer opens a clip and escape closes it before leaving", async function ({ page }) {
		await OpenScreen(page, "Works")
		await page.locator(".WorkTile").first().click()
		await expect(page.locator(".Viewer")).toBeVisible()
		await expect(page.locator(".ViewerTitle")).toHaveText("Hachi Cleave")
		await expect(page.locator(".ViewerMedia video")).toHaveAttribute("src", /HachiCleaveSfx\.mp4$/)
		await page.keyboard.press("Escape")
		await expect(page.locator(".Viewer")).toBeHidden()
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

test.describe("games", function () {
	test("lists games in order with live stats and play links", async function ({ page }) {
		await OpenScreen(page, "Games")
		await expect(page.locator(".GameItem")).toHaveText([
			"Type Soul", "Blades of Chance", "Brat Duels", "VEYTH", "Vania", "Steel Velocity", "Seraphs", "Multi Mayhem",
		])
		await expect(page.locator(".GameStats")).toContainText("818.7M")
		await expect(page.locator(".GamePlay")).toHaveAttribute("href", "https://www.roblox.com/games/14067600077")
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
	test("board, rates and terms render", async function ({ page }) {
		await OpenScreen(page, "Commissions")
		await expect(page.locator(".Job")).toHaveCount(1)
		await expect(page.locator(".JobFoot")).toContainText("1 of 2 done")
		await expect(page.locator(".JobPill")).toHaveText(/working on it/i)
		await page.keyboard.press("ArrowRight")
		await expect(page.locator(".Tier")).toHaveCount(7)
		await page.keyboard.press("ArrowRight")
		await expect(page.locator(".Terms li")).toHaveCount(7)
	})

	test("an empty board says slots are open", async function ({ page }) {
		await page.route("**/Commissions.json*", function (Route) { Route.fulfill({ json: { Jobs: [] } }) })
		await OpenScreen(page, "Commissions")
		await expect(page.locator("#ScreenCommissions .Empty")).toHaveText("nothing on the board right now, slots are open.")
	})
})

test.describe("latest and contact", function () {
	test("latest shows newest first with short dates", async function ({ page }) {
		await OpenScreen(page, "Latest")
		await expect(page.locator(".PostDate").first()).toHaveText("10/09")
	})

	test("contact hides empty links and opens the rest in a new tab", async function ({ page }) {
		await OpenScreen(page, "Contact")
		await expect(page.locator(".LinkRow")).toHaveCount(2)
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
