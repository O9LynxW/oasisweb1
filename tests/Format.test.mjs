import { test } from "node:test"
import Assert from "node:assert/strict"
import { FormatCount, TimeOfDay, FormatDate, FormatPrice, SlugFor } from "../js/Format.js"

test("FormatCount shortens large numbers", function () {
	Assert.equal(FormatCount(818708614), "818.7M")
	Assert.equal(FormatCount(833930183), "833.9M")
	Assert.equal(FormatCount(555066), "555.1K")
	Assert.equal(FormatCount(597), "597")
	Assert.equal(FormatCount(1000), "1K")
	Assert.equal(FormatCount(0), "0")
})

test("FormatCount shows a dash for bad values", function () {
	Assert.equal(FormatCount(NaN), "-")
	Assert.equal(FormatCount(undefined), "-")
	Assert.equal(FormatCount("lots"), "-")
})

test("TimeOfDay names the part of the day", function () {
	Assert.equal(TimeOfDay(5), "LATE NIGHT")
	Assert.equal(TimeOfDay(9), "MORNING")
	Assert.equal(TimeOfDay(14), "AFTERNOON")
	Assert.equal(TimeOfDay(19), "EVENING")
	Assert.equal(TimeOfDay(23), "NIGHT")
})

test("FormatDate gives month and day", function () {
	Assert.equal(FormatDate("2026-10-09"), "10/09")
	Assert.equal(FormatDate("nonsense"), "")
})

test("FormatPrice shows whole dollars plainly and cents when needed", function () {
	Assert.equal(FormatPrice(75), "$75")
	Assert.equal(FormatPrice(93.75), "$93.75")
})

test("SlugFor makes link-safe names", function () {
	Assert.equal(SlugFor("Gojo Cutscene"), "gojo-cutscene")
	Assert.equal(SlugFor("Oathbound Scythe Skill (practice)"), "oathbound-scythe-skill-practice")
	Assert.equal(SlugFor("Mystic / Light"), "mystic-light")
})
