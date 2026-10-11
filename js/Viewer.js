import { Create } from "./Dom.js"

export function CreateViewer(Sounds, OnClosed) {
	const Overlay = Create("div", "Viewer")
	Overlay.hidden = true
	Overlay.setAttribute("role", "dialog")
	Overlay.setAttribute("aria-modal", "true")

	const Panel = Create("div", "ViewerPanel")
	const Media = Create("div", "ViewerMedia")
	const Info = Create("div", "ViewerInfo")
	const Close = Create("button", "ViewerClose", "CLOSE")
	Panel.appendChild(Media)
	Panel.appendChild(Info)
	Overlay.appendChild(Panel)

	function BuildShare(Url) {
		const Share = Create("button", "ViewerShare", "COPY LINK")
		Share.addEventListener("click", function () {
			navigator.clipboard.writeText(Url)
				.then(function () { Share.textContent = "COPIED" })
				.catch(function () { Share.textContent = Url })
		})
		return Share
	}

	function CloseViewer() {
		if (Overlay.hidden) return false
		Media.replaceChildren()
		Overlay.hidden = true
		Sounds.Unduck()
		Sounds.Back()
		OnClosed()
		return true
	}

	function OpenViewer(Item) {
		Sounds.Select()
		const Shown = Item.Video ? Create("video") : Create("img")
		if (Item.Video) {
			Shown.src = Item.Video
			Shown.controls = true
			Shown.autoplay = true
			Shown.playsInline = true
			if (Item.Poster) Shown.poster = Item.Poster
			Sounds.Duck()
		} else {
			Shown.src = Item.Image
			Shown.alt = Item.Title
		}

		const Details = [Create("small", "ViewerMeta", Item.Meta)]
		if (Item.Heading) Details.push(Create("h3", "ViewerTitle", Item.Heading))
		if (Item.Note) Details.push(Create("p", "ViewerNote", Item.Note))
		if (Item.ShareUrl) Details.push(BuildShare(Item.ShareUrl))
		Details.push(Close)
		Media.replaceChildren(Shown)
		Info.replaceChildren(...Details)
		Overlay.hidden = false
		Close.focus({ preventScroll: true })
	}

	Close.addEventListener("click", CloseViewer)
	Overlay.addEventListener("click", function (ClickEvent) {
		if (ClickEvent.target === Overlay) CloseViewer()
	})

	return {
		Overlay: Overlay,
		Open: OpenViewer,
		Close: CloseViewer,
		IsOpen: function () { return !Overlay.hidden },
	}
}
