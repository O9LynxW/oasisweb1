import { Create, BuildPage, BuildEmpty, BuildTabs, Wrap } from "../Dom.js"

const TabCategories = [null, "VFX", "SFX", "UI", "Scripting"]
const TabLabels = ["ALL", "VFX", "SFX", "UI", "SCRIPTING"]

let Context = null
let Grid = null
let Tabs = null
let Viewer = null
let ActiveTab = 0
let Tiles = []
let FocusIndex = 0

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

	const Caption = Create("span", "WorkCaption")
	Caption.appendChild(Create("small", null, Work.Category.toUpperCase()))
	Caption.appendChild(Create("b", null, Work.Title))
	Tile.appendChild(Caption)

	Tile.addEventListener("focus", function () {
		FocusIndex = Tiles.indexOf(Tile)
	})
	Tile.addEventListener("click", function () { OpenViewer(Work) })
	return Tile
}

function RenderGrid() {
	StopPreviews()
	const Category = TabCategories[ActiveTab]
	const Visible = Context.Works.filter(function (Work) {
		return Category === null || Work.Category === Category
	})

	Tiles = Visible.map(BuildTile)
	FocusIndex = 0
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

function BuildViewer() {
	const Overlay = Create("div", "Viewer")
	Overlay.hidden = true
	Overlay.setAttribute("role", "dialog")
	Overlay.setAttribute("aria-modal", "true")

	const Panel = Create("div", "ViewerPanel")
	const Media = Create("div", "ViewerMedia")
	const Info = Create("div", "ViewerInfo")
	const Close = Create("button", "ViewerClose", "CLOSE")
	Close.addEventListener("click", CloseViewer)
	Overlay.addEventListener("click", function (ClickEvent) {
		if (ClickEvent.target === Overlay) CloseViewer()
	})

	Panel.appendChild(Media)
	Panel.appendChild(Info)
	Overlay.appendChild(Panel)
	return { Overlay: Overlay, Media: Media, Info: Info, Close: Close }
}

function OpenViewer(Work) {
	StopPreviews()
	Context.Sounds.Select()

	const Media = Work.Video ? Create("video") : Create("img")
	if (Work.Video) {
		Media.src = Work.Video
		Media.controls = true
		Media.autoplay = true
		Media.playsInline = true
		if (Work.Poster) Media.poster = Work.Poster
		Context.Sounds.Duck()
	} else {
		Media.src = Work.Poster
		Media.alt = Work.Title
	}

	const Meta = [Work.Category.toUpperCase(), Work.Game.toUpperCase()].filter(Boolean).join(" / ")
	Viewer.Media.replaceChildren(Media)
	const Details = [Create("small", "ViewerMeta", Meta), Create("h3", "ViewerTitle", Work.Title)]
	if (Work.Note) Details.push(Create("p", "ViewerNote", Work.Note))
	Details.push(Viewer.Close)
	Viewer.Info.replaceChildren(...Details)
	Viewer.Overlay.hidden = false
	Viewer.Close.focus({ preventScroll: true })
}

function CloseViewer() {
	if (Viewer.Overlay.hidden) return false
	Viewer.Media.replaceChildren()
	Viewer.Overlay.hidden = true
	Context.Sounds.Unduck()
	Context.Sounds.Back()
	if (Tiles[FocusIndex]) Tiles[FocusIndex].focus({ preventScroll: true })
	return true
}

function ColumnCount() {
	const Template = window.getComputedStyle(Grid).gridTemplateColumns
	return Math.max(1, Template.split(" ").filter(Boolean).length)
}

function MoveFocus(Step) {
	if (Tiles.length === 0) return
	FocusIndex = Math.min(Tiles.length - 1, Math.max(0, FocusIndex + Step))
	Tiles[FocusIndex].focus()
	Tiles[FocusIndex].scrollIntoView({ block: "nearest" })
	Context.Sounds.Move()
}

const KeyHandlers = {
	ArrowLeft: function () { MoveFocus(-1) },
	ArrowRight: function () { MoveFocus(1) },
	ArrowUp: function () { MoveFocus(-ColumnCount()) },
	ArrowDown: function () { MoveFocus(ColumnCount()) },
	q: function () { ChooseTab(ActiveTab - 1) },
	e: function () { ChooseTab(ActiveTab + 1) },
}

export const Name = "Works"

export function Mount(Root, SharedContext) {
	Context = SharedContext
	const Body = BuildPage(Root, "Works", "CLIPS AND BREAKDOWNS")
	Tabs = BuildTabs(TabLabels, ChooseTab)
	Grid = Create("div", "WorkGrid")
	Viewer = BuildViewer()

	Body.appendChild(Tabs.Row)
	Body.appendChild(Grid)
	Root.appendChild(Viewer.Overlay)
	PickTab(0)
}

export function OnHide() {
	StopPreviews()
	CloseViewer()
}

export function OnKey(Key) {
	if (Key === "Escape" || Key === "Backspace") return CloseViewer()
	if (!Viewer.Overlay.hidden) return false

	const Handler = KeyHandlers[Key]
	if (!Handler) return false
	Handler()
	return true
}
