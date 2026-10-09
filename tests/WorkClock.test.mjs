import { test } from "node:test"
import Assert from "node:assert/strict"
import { ParseClock, ZonedParts, IsWorking, NextStart, FormatClock, HoursLabel } from "../js/WorkClock.js"

const Hours = [
	{ Days: [0, 1, 2, 3, 4, 5], Start: 18 * 60, End: 90 },
	{ Days: [6], Start: 18 * 60, End: 0 },
]
const Sunday = 0
const Monday = 1
const Wednesday = 3
const Saturday = 6

test("ParseClock reads 24 hour times and rejects nonsense", function () {
	Assert.equal(ParseClock("18:00"), 1080)
	Assert.equal(ParseClock("01:30"), 90)
	Assert.equal(ParseClock("25:00"), null)
	Assert.equal(ParseClock("6pm"), null)
})

test("IsWorking handles shifts that run past midnight", function () {
	Assert.equal(IsWorking(Hours, Sunday, 19 * 60), true)
	Assert.equal(IsWorking(Hours, Monday, 60), true)
	Assert.equal(IsWorking(Hours, Monday, 2 * 60), false)
	Assert.equal(IsWorking(Hours, Saturday, 23 * 60 + 59), true)
	Assert.equal(IsWorking(Hours, Saturday, 60), true)
	Assert.equal(IsWorking(Hours, Sunday, 30), false)
	Assert.equal(IsWorking(Hours, Wednesday, 12 * 60), false)
})

test("NextStart finds the next shift today or later", function () {
	Assert.deepEqual(NextStart(Hours, Wednesday, 12 * 60), { Day: Wednesday, Start: 1080, IsToday: true })
	Assert.deepEqual(NextStart(Hours, Wednesday, 20 * 60), { Day: 4, Start: 1080, IsToday: false })
})

test("FormatClock and HoursLabel read like a person wrote them", function () {
	Assert.equal(FormatClock(1080), "6PM")
	Assert.equal(FormatClock(90), "1:30AM")
	Assert.equal(FormatClock(0), "12AM")
	Assert.equal(HoursLabel(Hours), "SUN-FRI 6PM-1:30AM / SAT 6PM-12AM")
})

test("ZonedParts converts to the given timezone", function () {
	const Moment = new Date("2026-10-10T23:30:00Z")
	Assert.deepEqual(ZonedParts(Moment, "Europe/London"), { Day: Sunday, Minutes: 30 })
	Assert.deepEqual(ZonedParts(Moment, "America/New_York"), { Day: Saturday, Minutes: 19 * 60 + 30 })
})
