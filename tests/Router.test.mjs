import { test } from "node:test"
import Assert from "node:assert/strict"
import { ScreenFromHash } from "../js/Router.js"

test("ScreenFromHash maps screen hashes in any case", function () {
	Assert.equal(ScreenFromHash("#works"), "Works")
	Assert.equal(ScreenFromHash("#GAMES"), "Games")
	Assert.equal(ScreenFromHash("#commissions"), "Commissions")
	Assert.equal(ScreenFromHash("#latest"), "Latest")
	Assert.equal(ScreenFromHash("#contact"), "Contact")
})

test("ScreenFromHash keeps the old site's links working", function () {
	Assert.equal(ScreenFromHash("#Work"), "Works")
	Assert.equal(ScreenFromHash("#Current"), "Commissions")
	Assert.equal(ScreenFromHash("#Commissions"), "Commissions")
	Assert.equal(ScreenFromHash("#Links"), "Contact")
})

test("ScreenFromHash falls back to the main menu", function () {
	Assert.equal(ScreenFromHash("#foo"), "Main")
	Assert.equal(ScreenFromHash(""), "Main")
	Assert.equal(ScreenFromHash(undefined), "Main")
	Assert.equal(ScreenFromHash("#constructor"), "Main")
})
