import { Create, BuildPage, BuildEmpty, BuildTabs, Wrap } from "../Dom.js"
import { CreateViewer } from "../Viewer.js"
import { CreateGridFocus } from "../GridFocus.js"
import { WorkSlugFromHash } from "../Router.js"

const TabCategories = [null, "VFX", "SFX", "UI", "Scripting"]
const TabLabels = ["ALL", "VFX", "SFX", "UI", "SCRIPTING"]

let Context = null
let Grid = null
let Tabs = null
let Viewer = null
let Focus = null
let KeyHandlers = {}
let ActiveTab = 0
let Tiles = []

function StopPreviews() {
	Tiles.forEach(function (Tile) {
		const Preview = Tile.querySelector("video")
		if (Preview && !Preview.paused) Preview.pause()
	})
}

function StartPreview(Tile) {
	const Preview = Tile.querySelector("video")
	if (!Preview) return
	if (Preview.preload !== "auto") Preview.preload = "auto"
	Preview.play().catch(function () { return })
}

function OpenWork(Work) {
	StopPreviews()
	Viewer.Open({
		Video: Work.Video,
		Poster: Work.Poster,
		Image: Work.Poster,
		Title: Work.Title,
		Meta: [Work.Category.toUpperCase(), Work.Game.toUpperCase()].filter(Boolean).join(" / "),
		Heading: Work.Title,
		Note: Work.Note,
		ShareUrl: Work.Video ? window.location.origin + "/works/" + Work.Slug + "/" : null,
	})
}

function BuildTile(Work) {
	const Tile = Create("button", "WorkTile")
	Tile.setAttribute("aria-label", Work.Title + ", " + Work.Category)

	if (Work.Poster) {
		const Poster = Create("img", "WorkPoster")
		Poster.src = Work.Poster
		Poster.alt = ""
		Poster.loading = "lazy"
		Tile.appendChild(Poster)
	}
	if (Work.Video) {
		const Preview = Create("video", "WorkPreview")
		Preview.src = Work.Video
		Preview.muted = true
		Preview.loop = true
		Preview.playsInline = true
		Preview.preload = "none"
		Tile.appendChild(Preview)
		Tile.addEventListener("mouseenter", function () { StartPreview(Tile) })
		Tile.addEventListener("mouseleave", function () { Preview.pause() })
	}

	if (Work.Pinned) Tile.appendChild(Create("span", "WorkPin", "PINNED"))

	const Caption = Create("span", "WorkCaption")
	Caption.appendChild(Create("small", null, Work.Category.toUpperCase()))
	Caption.appendChild(Create("b", null, Work.Title))
	Tile.appendChild(Caption)
	Tile.addEventListener("click", function () { OpenWork(Work) })
	return Tile
}

function RenderGrid() {
	StopPreviews()
	const Category = TabCategories[ActiveTab]
	const Visible = Context.Works.filter(function (Work) {
		return Category === null || Work.Category === Category
	})

	Tiles = Visible.map(BuildTile)
	Focus.SetTiles(Tiles)
	Grid.replaceChildren(...Tiles)
	if (Tiles.length === 0) Grid.appendChild(BuildEmpty("nothing here yet"))
}

function PickTab(Index) {
	ActiveTab = Wrap(Index, TabLabels.length)
	Tabs.Select(ActiveTab)
	RenderGrid()
}

function ChooseTab(Index) {
	PickTab(Index)
	Context.Sounds.Tab()
}

const TabKeys = {
	q: function () { ChooseTab(ActiveTab - 1) },
	e: function () { ChooseTab(ActiveTab + 1) },
}

export const Name = "Works"

export function Mount(Root, SharedContext) {
	Context = SharedContext
	const Body = BuildPage(Root, "Works", "CLIPS AND BREAKDOWNS")
	Tabs = BuildTabs(TabLabels, ChooseTab)
	Grid = Create("div", "WorkGrid")
	Focus = CreateGridFocus(Grid, Context.Sounds)
	Viewer = CreateViewer(Context.Sounds, function () { Focus.Restore() })
	KeyHandlers = Object.assign({}, Focus.KeyHandlers, TabKeys)

	Body.appendChild(Tabs.Row)
	Body.appendChild(Grid)
	Root.appendChild(Viewer.Overlay)
	PickTab(0)
}

export function OnShow() {
	const Slug = WorkSlugFromHash(window.location.hash)
	const Work = Context.Works.find(function (Candidate) { return Candidate.Slug === Slug })
	if (Work) OpenWork(Work)
}

export function OnHide() {
	StopPreviews()
	Viewer.Close()
}

export function OnKey(Key) {
	if (Key === "Escape" || Key === "Backspace") return Viewer.Close()
	if (Viewer.IsOpen()) return false

	const Handler = KeyHandlers[Key]
	if (!Handler) return false
	Handler()
	return true
}
