import { LoadJson, CleanGames, CleanWorks, CleanPosts, CleanJobs, CleanStats, CleanSite } from "./Data.js"
import { StartRouter, ScreenFromHash } from "./Router.js"
import { StartClock, StartPresence } from "./Hud.js"
import { CreateSounds } from "./Player.js"
import * as Menu from "./Screens/Menu.js"
import * as Works from "./Screens/Works.js"
import * as Games from "./Screens/Games.js"
import * as Commissions from "./Screens/Commissions.js"
import * as Latest from "./Screens/Latest.js"
import * as Contact from "./Screens/Contact.js"

const Screens = [Menu, Works, Games, Commissions, Latest, Contact]
const IgnoredKeys = ["Shift", "Control", "Alt", "Meta", "Tab", "CapsLock"]

async function LoadContext() {
	const Payloads = await Promise.all([
		LoadJson("data/Games.json"),
		LoadJson("data/Works.json"),
		LoadJson("data/Posts.json"),
		LoadJson("Commissions.json?v=" + Date.now()),
		LoadJson("data/Stats.json"),
		LoadJson("data/Site.json"),
	])

	return {
		Games: CleanGames(Payloads[0]),
		Works: CleanWorks(Payloads[1]),
		Posts: CleanPosts(Payloads[2]),
		Jobs: CleanJobs(Payloads[3]) || [],
		Stats: CleanStats(Payloads[4]),
		Site: CleanSite(Payloads[5]),
	}
}

function IsTypingTarget(Target) {
	return Target instanceof HTMLInputElement || Target instanceof HTMLTextAreaElement
}

function StartTitle(Router, Sounds) {
	const Title = document.getElementById("Title")
	const StartScreen = ScreenFromHash(window.location.hash)

	function UnlockOnce() {
		Sounds.Unlock()
		document.removeEventListener("pointerdown", UnlockOnce)
	}

	if (StartScreen !== "Main") {
		Title.hidden = true
		Router.ShowNow(StartScreen)
		document.addEventListener("pointerdown", UnlockOnce)
		return function () { return false }
	}

	function Dismiss() {
		if (Title.hidden || Router.IsTransitioning()) return
		UnlockOnce()
		Router.Wipe(function () {
			Title.hidden = true
			Router.ShowNow("Main")
		})
	}

	Title.addEventListener("click", Dismiss)
	return function () {
		if (Title.hidden) return false
		Dismiss()
		return true
	}
}

async function Boot() {
	const Context = await LoadContext()
	const Sounds = CreateSounds(Context.Site.Track, document.getElementById("Player"))
	const Router = StartRouter(Screens, {
		Sections: Array.from(document.querySelectorAll(".Screen")),
		BackButton: document.getElementById("BackButton"),
		Wipe: document.getElementById("Wipe"),
	}, Sounds)

	Context.Sounds = Sounds
	Context.GoTo = Router.GoTo
	Screens.forEach(function (Screen) {
		Screen.Mount(document.getElementById("Screen" + Screen.Name), Context)
	})

	StartClock(document.getElementById("HudDate"), document.getElementById("HudTime"))
	StartPresence(Context.Site.DiscordUserId, {
		Name: document.getElementById("PresenceName"),
		Label: document.getElementById("PresenceLabel"),
		Dot: document.getElementById("PresenceDot"),
		Root: document.getElementById("Presence"),
	})

	const HandleTitleKey = StartTitle(Router, Sounds)
	document.addEventListener("keydown", function (KeyEvent) {
		if (KeyEvent.ctrlKey || KeyEvent.metaKey || KeyEvent.altKey) return
		if (IgnoredKeys.includes(KeyEvent.key) || IsTypingTarget(KeyEvent.target)) return
		Sounds.Unlock()
		if (HandleTitleKey() || Router.HandleKey(KeyEvent.key)) KeyEvent.preventDefault()
	})
	document.body.classList.add("Ready")
}

Boot()
