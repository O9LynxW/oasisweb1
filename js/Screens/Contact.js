import { Create, BuildPage, BuildEmpty, OpenExternal, Wrap } from "../Dom.js"

let Context = null
let Rows = []
let FocusIndex = 0

function Move(Step) {
	if (Rows.length === 0) return
	FocusIndex = Wrap(FocusIndex + Step, Rows.length)
	Rows[FocusIndex].focus({ preventScroll: true })
	Context.Sounds.Move()
}

const KeyHandlers = {
	ArrowUp: function () { Move(-1) },
	ArrowDown: function () { Move(1) },
}

export const Name = "Contact"

export function Mount(Root, SharedContext) {
	Context = SharedContext
	const Body = BuildPage(Root, "Contact", "DISCORD IS FASTEST")
	if (Context.Site.Links.length === 0) {
		Body.appendChild(BuildEmpty("links coming soon"))
		return
	}

	const List = Create("nav", "Links")
	List.setAttribute("aria-label", "Links")
	Rows = Context.Site.Links.map(function (Link, Index) {
		const Row = OpenExternal(Create("a", "LinkRow", Link.Title), Link.Url)
		Row.appendChild(Create("small", null, Link.Subtitle))
		Row.addEventListener("focus", function () { FocusIndex = Index })
		List.appendChild(Row)
		return Row
	})
	Body.appendChild(List)
}

export function OnShow() {
	FocusIndex = 0
}

export function OnKey(Key) {
	const Handler = KeyHandlers[Key]
	if (!Handler) return false
	Handler()
	return true
}
