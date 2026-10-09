export function CreateGridFocus(Grid, Sounds) {
	let Tiles = []
	let FocusIndex = 0

	function ColumnCount() {
		const Template = window.getComputedStyle(Grid).gridTemplateColumns
		return Math.max(1, Template.split(" ").filter(Boolean).length)
	}

	function Move(Step) {
		if (Tiles.length === 0) return
		FocusIndex = Math.min(Tiles.length - 1, Math.max(0, FocusIndex + Step))
		Tiles[FocusIndex].focus()
		Tiles[FocusIndex].scrollIntoView({ block: "nearest" })
		Sounds.Move()
	}

	return {
		SetTiles: function (NewTiles) {
			Tiles = NewTiles
			FocusIndex = 0
			Tiles.forEach(function (Tile, Index) {
				Tile.addEventListener("focus", function () { FocusIndex = Index })
			})
		},
		Restore: function () {
			if (Tiles[FocusIndex]) Tiles[FocusIndex].focus({ preventScroll: true })
		},
		KeyHandlers: {
			ArrowLeft: function () { Move(-1) },
			ArrowRight: function () { Move(1) },
			ArrowUp: function () { Move(-ColumnCount()) },
			ArrowDown: function () { Move(ColumnCount()) },
		},
	}
}
