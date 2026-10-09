import { Create, Wrap } from "../Dom.js"
import { FormatCount } from "../Format.js"

const MenuEntries = [
	{ Target: "Works", Tag: "CLIPS" },
	{ Target: "Games", Tag: "CREDITS" },
	{ Target: "Commissions", Tag: "RATES" },
	{ Target: "Latest", Tag: "NEWS" },
	{ Target: "Contact", Tag: "LINKS" },
]

let Items = []
let ActiveIndex = 0
let Context = null

function SetActive(Index) {
	ActiveIndex = Wrap(Index, Items.length)
	Items.forEach(function (Item, ItemIndex) {
		Item.classList.toggle("Active", ItemIndex === ActiveIndex)
	})
}

function Move(Step) {
	SetActive(ActiveIndex + Step)
	Items[ActiveIndex].focus({ preventScroll: true })
	Context.Sounds.Move()
}

function BuildStat(Value, Label) {
	const Stat = Create("div", "MainStat")
	Stat.appendChild(Create("b", null, Value))
	Stat.appendChild(Create("small", null, Label))
	return Stat
}

function BuildName(Stats, GameCount) {
	const Block = Create("div", "MainName")
	Block.appendChild(Create("h1", null, "OASIS"))
	Block.appendChild(Create("div", "MainRole", "SCRIPTER / VFX / UI / SFX"))

	const Row = Create("div", "MainStats")
	Row.appendChild(BuildStat(FormatCount(Stats.Totals.Visits), "VISITS"))
	Row.appendChild(BuildStat(FormatCount(Stats.Totals.Favorites), "FAVORITES"))
	Row.appendChild(BuildStat(String(GameCount), "GAMES"))
	Block.appendChild(Row)
	return Block
}

function BuildMenu() {
	const Nav = Create("nav", "Menu")
	Nav.setAttribute("aria-label", "Main menu")

	Items = MenuEntries.map(function (Entry, Index) {
		const Item = Create("button", "MenuItem", Entry.Target)
		Item.appendChild(Create("small", null, Entry.Tag))
		Item.addEventListener("mouseenter", function () {
			if (Index !== ActiveIndex) Context.Sounds.Move()
			SetActive(Index)
		})
		Item.addEventListener("focus", function () { SetActive(Index) })
		Item.addEventListener("click", function () { Context.GoTo(Entry.Target) })
		Nav.appendChild(Item)
		return Item
	})
	return Nav
}

const KeyHandlers = {
	ArrowUp: function () { Move(-1) },
	ArrowDown: function () { Move(1) },
	Enter: function () { Context.GoTo(MenuEntries[ActiveIndex].Target) },
}

export const Name = "Main"

export function Mount(Root, SharedContext) {
	Context = SharedContext
	Root.appendChild(BuildName(Context.Stats, Context.Games.length))
	Root.appendChild(BuildMenu())
	SetActive(0)
}

export function OnShow() {
	Items[ActiveIndex].focus({ preventScroll: true })
}

export function OnKey(Key) {
	const Handler = KeyHandlers[Key]
	if (!Handler) return false
	Handler()
	return true
}
