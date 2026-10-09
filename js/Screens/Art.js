import { Create, BuildPage, BuildEmpty } from "../Dom.js"
import { CreateViewer } from "../Viewer.js"
import { CreateGridFocus } from "../GridFocus.js"

const PersonalNote = "just stuff i draw for fun. these are personal pieces, i don't take art commissions."
const ViewerMeta = "PERSONAL ART"
const ViewerNote = "not for commission."

let Viewer = null
let Focus = null

function BuildTile(Piece, Index) {
	const Tile = Create("button", "ArtTile")
	Tile.setAttribute("aria-label", "personal art piece " + (Index + 1))
	const Thumb = Create("img")
	Thumb.src = Piece.Thumb
	Thumb.alt = ""
	Thumb.loading = "lazy"
	Tile.appendChild(Thumb)
	Tile.addEventListener("click", function () {
		Viewer.Open({ Image: Piece.Image, Title: "personal art piece " + (Index + 1), Meta: ViewerMeta, Note: ViewerNote })
	})
	return Tile
}

export const Name = "Art"

export function Mount(Root, Context) {
	const Body = BuildPage(Root, "Art", "PERSONAL PIECES")
	Body.appendChild(Create("p", "Quote", PersonalNote))
	if (Context.Art.length === 0) {
		Body.appendChild(BuildEmpty("nothing posted yet"))
		return
	}

	const Grid = Create("div", "ArtGrid")
	const Tiles = Context.Art.map(BuildTile)
	Grid.replaceChildren(...Tiles)
	Body.appendChild(Grid)

	Focus = CreateGridFocus(Grid, Context.Sounds)
	Focus.SetTiles(Tiles)
	Viewer = CreateViewer(Context.Sounds, function () { Focus.Restore() })
	Root.appendChild(Viewer.Overlay)
}

export function OnHide() {
	if (Viewer) Viewer.Close()
}

export function OnKey(Key) {
	if (!Viewer) return false
	if (Key === "Escape" || Key === "Backspace") return Viewer.Close()
	if (Viewer.IsOpen()) return false

	const Handler = Focus.KeyHandlers[Key]
	if (!Handler) return false
	Handler()
	return true
}
