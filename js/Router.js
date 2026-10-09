const HashScreens = {
	works: "Works",
	work: "Works",
	games: "Games",
	art: "Art",
	commissions: "Commissions",
	current: "Commissions",
	latest: "Latest",
	contact: "Contact",
	links: "Contact",
}

const WipeHalfMs = 300
const ReducedWipeHalfMs = 20

export function ScreenFromHash(Hash) {
	const Key = String(Hash || "").replace(/^#/, "").toLowerCase()
	return Object.prototype.hasOwnProperty.call(HashScreens, Key) ? HashScreens[Key] : "Main"
}

function HashFor(Name) {
	return Name === "Main" ? "" : "#" + Name.toLowerCase()
}

export function StartRouter(Screens, Elements, Sounds) {
	const ScreensByName = new Map(Screens.map(function (Screen) { return [Screen.Name, Screen] }))
	const ReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
	let Current = null
	let Transitioning = false
	let PendingFromHistory = null
	let WipeCount = 0

	function HalfMs() {
		return ReducedMotion.matches ? ReducedWipeHalfMs : WipeHalfMs
	}

	function Show(Name) {
		const Previous = ScreensByName.get(Current)
		if (Previous && Previous.OnHide) Previous.OnHide()

		Elements.Sections.forEach(function (Section) {
			Section.classList.toggle("Shown", Section.dataset.screen === Name)
		})
		Elements.BackButton.hidden = Name === "Main"
		document.body.dataset.screen = Name
		Current = Name

		const Next = ScreensByName.get(Name)
		if (Next && Next.OnShow) Next.OnShow()
	}

	function Wipe(OnMiddle) {
		Transitioning = true
		Sounds.Wipe()
		WipeCount += 1
		const ThisWipe = WipeCount
		Elements.Wipe.classList.remove("Run")
		void Elements.Wipe.offsetWidth
		Elements.Wipe.classList.add("Run")

		window.setTimeout(function () {
			OnMiddle()
			Transitioning = false
			if (PendingFromHistory === null) return

			const Pending = PendingFromHistory
			PendingFromHistory = null
			GoTo(Pending, true)
		}, HalfMs())
		window.setTimeout(function () {
			if (ThisWipe === WipeCount) Elements.Wipe.classList.remove("Run")
		}, HalfMs() * 2)
	}

	function GoTo(Name, FromHistory) {
		const Target = ScreensByName.has(Name) ? Name : "Main"
		if (Transitioning) {
			if (FromHistory) PendingFromHistory = Target
			return
		}
		if (Target === Current) return

		if (Target === "Main") Sounds.Back()
		else Sounds.Select()

		if (!FromHistory) {
			const Url = window.location.pathname + window.location.search + HashFor(Target)
			window.history.pushState(null, "", Url)
		}
		Wipe(function () { Show(Target) })
	}

	function HandleKey(Key) {
		if (Transitioning) return true

		const Screen = ScreensByName.get(Current)
		if (Screen && Screen.OnKey && Screen.OnKey(Key)) return true

		if ((Key === "Escape" || Key === "Backspace") && Current !== "Main") {
			GoTo("Main")
			return true
		}
		return false
	}

	window.addEventListener("popstate", function () {
		GoTo(ScreenFromHash(window.location.hash), true)
	})
	Elements.BackButton.addEventListener("click", function () { GoTo("Main") })

	return {
		GoTo: GoTo,
		Wipe: Wipe,
		HandleKey: HandleKey,
		ShowNow: Show,
		Current: function () { return Current },
		IsTransitioning: function () { return Transitioning },
	}
}
