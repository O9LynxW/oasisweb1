const DayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
const MinutesPerDay = 1440
const RefreshMs = 30000

export function ParseClock(Text) {
	const Match = /^(\d{1,2}):(\d{2})$/.exec(String(Text))
	if (!Match) return null
	const Hours = Number(Match[1])
	const Minutes = Number(Match[2])
	if (Hours > 23 || Minutes > 59) return null
	return Hours * 60 + Minutes
}

export function ZonedParts(Moment, TimeZone) {
	const Parts = new Intl.DateTimeFormat("en-GB", {
		timeZone: TimeZone,
		weekday: "short",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).formatToParts(Moment)
	const Read = function (Type) {
		return Parts.find(function (Part) { return Part.type === Type }).value
	}
	return {
		Day: DayNames.indexOf(Read("weekday").toUpperCase()),
		Minutes: Number(Read("hour")) * 60 + Number(Read("minute")),
	}
}

function CrossesMidnight(Block) {
	return Block.End <= Block.Start
}

export function IsWorking(Hours, Day, Minutes) {
	const PreviousDay = (Day + 6) % 7
	return Hours.some(function (Block) {
		if (!CrossesMidnight(Block)) return Block.Days.includes(Day) && Minutes >= Block.Start && Minutes < Block.End
		const StartedToday = Block.Days.includes(Day) && Minutes >= Block.Start
		const CarriedOver = Block.Days.includes(PreviousDay) && Minutes < Block.End
		return StartedToday || CarriedOver
	})
}

export function NextStart(Hours, Day, Minutes) {
	for (let Offset = 0; Offset <= 7; Offset++) {
		const CheckDay = (Day + Offset) % 7
		const Starts = Hours
			.filter(function (Block) { return Block.Days.includes(CheckDay) })
			.map(function (Block) { return Block.Start })
			.filter(function (Start) { return Offset > 0 || Start > Minutes })
			.sort(function (First, Second) { return First - Second })
		if (Starts.length > 0) return { Day: CheckDay, Start: Starts[0], IsToday: Offset === 0 }
	}
	return null
}

export function FormatClock(Minutes) {
	const Wrapped = ((Minutes % MinutesPerDay) + MinutesPerDay) % MinutesPerDay
	const Hours = Math.floor(Wrapped / 60)
	const Rest = Wrapped % 60
	const Suffix = Hours < 12 ? "AM" : "PM"
	const Shown = Hours % 12 === 0 ? 12 : Hours % 12
	return Shown + (Rest === 0 ? "" : ":" + String(Rest).padStart(2, "0")) + Suffix
}

export function DaysLabel(Days) {
	const Sorted = Days.slice().sort(function (First, Second) { return First - Second })
	const IsRun = Sorted.every(function (Day, Index) { return Index === 0 || Day === Sorted[Index - 1] + 1 })
	if (Sorted.length === 1) return DayNames[Sorted[0]]
	if (IsRun) return DayNames[Sorted[0]] + "-" + DayNames[Sorted[Sorted.length - 1]]
	return Sorted.map(function (Day) { return DayNames[Day] }).join(", ")
}

export function HoursLabel(Hours) {
	return Hours.map(function (Block) {
		return DaysLabel(Block.Days) + " " + FormatClock(Block.Start) + "-" + FormatClock(Block.End)
	}).join(" / ")
}

function LocalClock(Moment, TimeZone) {
	const Parts = ZonedParts(Moment, TimeZone)
	return FormatClock(Parts.Minutes)
}

function StatusText(Site, Moment) {
	const Parts = ZonedParts(Moment, Site.TimeZone)
	if (IsWorking(Site.WorkHours, Parts.Day, Parts.Minutes)) return { Working: true, Text: "WORKING NOW" }
	const Next = NextStart(Site.WorkHours, Parts.Day, Parts.Minutes)
	if (!Next) return { Working: false, Text: "OFF RIGHT NOW" }
	const When = Next.IsToday ? "" : DayNames[Next.Day] + " "
	return { Working: false, Text: "OFF, BACK " + When + FormatClock(Next.Start) + " " + Site.TimeZoneLabel }
}

function BuildRow(Label) {
	const Row = document.createElement("div")
	Row.className = "ClockRow"
	const Name = document.createElement("small")
	Name.textContent = Label
	const Value = document.createElement("b")
	Row.appendChild(Name)
	Row.appendChild(Value)
	return { Row: Row, Value: Value }
}

export function BuildWorkClock(Site) {
	const Panel = document.createElement("div")
	Panel.className = "WorkClock"
	if (!Site.TimeZone || Site.WorkHours.length === 0) {
		Panel.hidden = true
		return Panel
	}

	const VisitorZone = Intl.DateTimeFormat().resolvedOptions().timeZone
	const Mine = BuildRow("MY TIME")
	const Yours = BuildRow("YOUR TIME")
	const Hours = BuildRow("WORK HOURS")
	const Status = document.createElement("div")
	Status.className = "ClockStatus"
	Hours.Value.textContent = HoursLabel(Site.WorkHours) + " " + Site.TimeZoneLabel

	function Render() {
		const Now = new Date()
		const State = StatusText(Site, Now)
		Mine.Value.textContent = LocalClock(Now, Site.TimeZone) + " " + Site.TimeZoneLabel
		Yours.Value.textContent = LocalClock(Now, VisitorZone)
		Status.textContent = State.Text
		Status.classList.toggle("Working", State.Working)
	}

	Panel.appendChild(Status)
	Panel.appendChild(Mine.Row)
	Panel.appendChild(Yours.Row)
	Panel.appendChild(Hours.Row)
	Render()
	window.setInterval(Render, RefreshMs)
	return Panel
}
