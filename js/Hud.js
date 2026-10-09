import { FormatCount, TimeOfDay } from "./Format.js"

const DayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
const ClockRefreshMs = 30000
const PresenceRefreshMs = 60000
const LanyardUrl = "https://api.lanyard.rest/v1/users/"
const StatusLabels = { online: "ONLINE", idle: "IDLE", dnd: "DO NOT DISTURB", offline: "OFFLINE" }
const StatusClasses = { idle: "Idle", dnd: "Dnd", offline: "Offline" }
const VisitedKey = "OasisVisitCounted"

function RenderClock(DateElement, TimeElement) {
	const Now = new Date()
	const Month = String(Now.getMonth() + 1).padStart(2, "0")
	const Day = String(Now.getDate()).padStart(2, "0")
	const DayName = document.createElement("span")
	DayName.textContent = DayNames[Now.getDay()]

	DateElement.replaceChildren(document.createTextNode(Month + "/" + Day), DayName)
	TimeElement.textContent = TimeOfDay(Now.getHours())
}

export function StartClock(DateElement, TimeElement) {
	RenderClock(DateElement, TimeElement)
	window.setInterval(function () { RenderClock(DateElement, TimeElement) }, ClockRefreshMs)
}

function ApplyPresence(Data, Elements) {
	const User = Data.discord_user || {}
	const Status = Object.prototype.hasOwnProperty.call(StatusLabels, Data.discord_status) ? Data.discord_status : "offline"

	Elements.Name.textContent = (User.display_name || User.global_name || User.username || "DISCORD").toUpperCase()
	Elements.Label.textContent = StatusLabels[Status]
	Elements.Dot.className = "PresenceDot"
	if (StatusClasses[Status]) Elements.Dot.classList.add(StatusClasses[Status])

	if (!User.avatar || !User.id) return
	const Extension = String(User.avatar).startsWith("a_") ? ".gif" : ".png"
	const Avatar = Elements.Root.querySelector(".PresenceAvatar") || document.createElement("img")
	Avatar.className = "PresenceAvatar"
	Avatar.alt = ""
	Avatar.src = "https://cdn.discordapp.com/avatars/" + encodeURIComponent(User.id) + "/" +
		encodeURIComponent(User.avatar) + Extension + "?size=128"
	if (!Avatar.parentNode) Elements.Root.prepend(Avatar)
}

async function FetchPresence(UserId, Elements) {
	try {
		const Reply = await fetch(LanyardUrl + UserId, { cache: "no-store" })
		if (!Reply.ok) return
		const Payload = await Reply.json()
		if (Payload && Payload.success === true && Payload.data) ApplyPresence(Payload.data, Elements)
	} catch {
		return
	}
}

export function StartPresence(UserId, Elements) {
	if (!UserId) return
	FetchPresence(UserId, Elements)
	window.setInterval(function () { FetchPresence(UserId, Elements) }, PresenceRefreshMs)
	document.addEventListener("visibilitychange", function () {
		if (!document.hidden) FetchPresence(UserId, Elements)
	})
}

function AlreadyCounted() {
	try {
		return window.sessionStorage.getItem(VisitedKey) === "yes"
	} catch {
		return true
	}
}

function MarkCounted() {
	try {
		window.sessionStorage.setItem(VisitedKey, "yes")
	} catch {
		return
	}
}

export async function StartVisitCounter(Url, Element) {
	if (!Url) return
	const ShouldCount = !AlreadyCounted()

	try {
		const Reply = ShouldCount
			? await fetch(Url, { method: "POST", body: JSON.stringify({ Referrer: document.referrer }) })
			: await fetch(Url, { cache: "no-store" })
		if (!Reply.ok) return
		const Result = await Reply.json()
		if (!Result || !Number.isFinite(Result.Count)) return
		if (ShouldCount) MarkCounted()
		const Count = document.createElement("b")
		Count.textContent = FormatCount(Result.Count)
		const Label = document.createElement("small")
		Label.textContent = "SITE VISITS"
		Element.replaceChildren(Count, Label)
		Element.hidden = false
	} catch {
		return
	}
}
