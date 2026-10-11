const CountUnits = [
	{ Size: 1e9, Suffix: "B" },
	{ Size: 1e6, Suffix: "M" },
	{ Size: 1e3, Suffix: "K" },
]

const DayParts = [
	{ Before: 6, Name: "LATE NIGHT" },
	{ Before: 12, Name: "MORNING" },
	{ Before: 17, Name: "AFTERNOON" },
	{ Before: 21, Name: "EVENING" },
	{ Before: 24, Name: "NIGHT" },
]

function TrimDecimal(Value) {
	return Value.toFixed(1).replace(/\.0$/, "")
}

export function SlugFor(Title) {
	return String(Title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

export function FormatCount(Value) {
	if (typeof Value !== "number" || !Number.isFinite(Value)) return "-"

	const Unit = CountUnits.find(function (Candidate) {
		return Math.abs(Value) >= Candidate.Size
	})
	if (!Unit) return String(Math.round(Value))

	return TrimDecimal(Value / Unit.Size) + Unit.Suffix
}

export function TimeOfDay(Hour) {
	const Part = DayParts.find(function (Candidate) {
		return Hour < Candidate.Before
	})
	return Part ? Part.Name : "NIGHT"
}

export function FormatDate(Iso) {
	const Match = /^\d{4}-(\d{2})-(\d{2})/.exec(String(Iso))
	if (!Match) return ""
	return Match[1] + "/" + Match[2]
}

export function FormatPrice(Value) {
	return "$" + (Number.isInteger(Value) ? String(Value) : Value.toFixed(2))
}
