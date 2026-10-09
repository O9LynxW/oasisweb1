import { Create, BuildPage, BuildEmpty, OpenExternal, Wrap } from "../Dom.js"
import { FormatCount } from "../Format.js"

const PlayUrl = "https://www.roblox.com/games/"
const StatusTags = { InDevelopment: "IN DEVELOPMENT", Contribution: "CONTRIBUTION" }
const ContributionLabel = "CONTRIBUTED TO"

let Context = null
let Items = []
let Panel = null
let ActiveIndex = 0

function BuildStats(GameStats) {
	const Row = Create("div", "GameStats")
	const Entries = [
		[GameStats.Visits, "VISITS"],
		[GameStats.Favorites, "FAVORITES"],
		[GameStats.Playing, "PLAYING NOW"],
	]
	Entries.forEach(function (Entry) {
		const Stat = Create("div", "GameStat")
		Stat.appendChild(Create("b", null, FormatCount(Entry[0])))
		Stat.appendChild(Create("small", null, Entry[1]))
		Row.appendChild(Stat)
	})
	return Row
}

function BuildPanelContent(Game) {
	const Parts = []

	const Thumb = Create("div", "GameThumb")
	if (Game.Thumb) {
		const ThumbImage = Create("img")
		ThumbImage.src = Game.Thumb
		ThumbImage.alt = Game.Name
		Thumb.appendChild(ThumbImage)
	}
	Parts.push(Thumb)
	Parts.push(Create("div", "GameRole", Game.Role.toUpperCase()))
	if (Game.Blurb) Parts.push(Create("p", "GameBlurb", Game.Blurb))

	const Actions = Create("div", "GameActions")
	const GameStats = Game.PlaceId ? Context.Stats.Games[Game.PlaceId] : null
	if (StatusTags[Game.Status]) {
		Actions.appendChild(Create("div", "GameTag", StatusTags[Game.Status]))
	} else if (GameStats) {
		Actions.appendChild(BuildStats(GameStats))
	}

	if (Game.PlaceId && Game.Status === "Live") {
		Actions.appendChild(OpenExternal(Create("a", "GamePlay", "PLAY"), PlayUrl + encodeURIComponent(Game.PlaceId)))
	}
	if (Game.Link) {
		Actions.appendChild(OpenExternal(Create("a", "GamePlay GameLink", "DISCORD"), Game.Link))
	}
	Parts.push(Actions)
	return Parts
}

function SetActive(Index) {
	ActiveIndex = Wrap(Index, Items.length)
	Items.forEach(function (Item, ItemIndex) {
		Item.classList.toggle("Active", ItemIndex === ActiveIndex)
		Item.setAttribute("aria-selected", String(ItemIndex === ActiveIndex))
	})

	Panel.replaceChildren(...BuildPanelContent(Context.Games[ActiveIndex]))
	Panel.classList.remove("Swap")
	void Panel.offsetWidth
	Panel.classList.add("Swap")
}

function Move(Step) {
	SetActive(ActiveIndex + Step)
	Items[ActiveIndex].focus({ preventScroll: true })
	Context.Sounds.Move()
}

const KeyHandlers = {
	ArrowUp: function () { Move(-1) },
	ArrowDown: function () { Move(1) },
}

export const Name = "Games"

export function Mount(Root, SharedContext) {
	Context = SharedContext
	const Body = BuildPage(Root, "Games", "WHERE MY WORK LIVES")
	if (Context.Games.length === 0) {
		Body.appendChild(BuildEmpty("no games listed yet"))
		return
	}

	const Layout = Create("div", "Games")
	const List = Create("div", "GameList")
	List.setAttribute("role", "tablist")
	Panel = Create("div", "GamePanel")
	Panel.setAttribute("role", "tabpanel")

	const FirstContribution = Context.Games.findIndex(function (Game) { return Game.Status === "Contribution" })
	Items = Context.Games.map(function (Game, Index) {
		if (Index === FirstContribution) List.appendChild(Create("div", "GameGroup", ContributionLabel))
		const Item = Create("button", "GameItem", Game.Name)
		Item.setAttribute("role", "tab")
		Item.addEventListener("mouseenter", function () {
			if (Index !== ActiveIndex) Context.Sounds.Move()
			SetActive(Index)
		})
		Item.addEventListener("click", function () { SetActive(Index) })
		List.appendChild(Item)
		return Item
	})

	Layout.appendChild(List)
	Layout.appendChild(Panel)
	Body.appendChild(Layout)
	SetActive(0)
}

export function OnKey(Key) {
	if (Items.length === 0) return false
	const Handler = KeyHandlers[Key]
	if (!Handler) return false
	Handler()
	return true
}
