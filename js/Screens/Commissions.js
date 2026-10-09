import { Create, BuildPage, BuildTabs, OpenExternal, Wrap } from "../Dom.js"
import { BuildRequestForm } from "./RequestForm.js"

const TabLabels = ["RATES", "PAYMENT", "REQUEST"]
const QuoteText = "price depends on scope, i'll explain any change before starting it."
const PayPalUrl = "https://paypal.me/oasis098"

const RateGroups = [
	{
		Title: "SCRIPTING",
		Detail: "same day to a week, depending on the extent of what's needed",
		Tiers: [
			{ Name: "One Skill", Price: "$22", Scope: "PER JOB", Note: "front end." },
			{ Name: "Movement System", Price: "$45", Scope: "PER JOB", Note: "" },
			{ Name: "Backend Framework", Price: "$110", Scope: "PER JOB", Note: "" },
			{ Name: "Basic Combat", Price: "$150", Scope: "PACKAGE", Note: "basic attack, heavy attack, block, stun, parry and dodge." },
			{ Name: "Advanced Combat", Price: "$190", Scope: "PACKAGE",
				Note: "everything in basic, 50% off extra skills, plus ongoing support for bugs and compatibility." },
		],
	},
	{
		Title: "VFX",
		Detail: "scales with difficulty. no cutscenes",
		Tiers: [
			{ Name: "One Move", Price: "$10", Scope: "PER MOVE", Note: "or R$5,000 per move." },
		],
	},
	{
		Title: "SFX",
		Detail: "send a good quality clip of what it's for. 2 free revisions, $5 each after",
		Tiers: [
			{ Name: "Simple", Price: "$5", Scope: "PER SOUND", Note: "ui, menus, pickups and simple one-shots." },
			{ Name: "Abilities", Price: "$15", Scope: "PER SOUND", Note: "skills and combat hits, layered and designed from scratch." },
			{ Name: "Cutscenes", Price: "$20", Scope: "PER SOUND", Note: "cutscenes, trailers, anything that needs to carry a scene." },
		],
	},
]

const Currencies = [
	{ Emoji: "\u{1F4B5}", Icon: null, Name: "USD", Preferred: true },
	{ Emoji: "\u{1F4B7}", Icon: null, Name: "GBP", Preferred: true },
	{ Emoji: null, Icon: "media/Icons/Robux.svg", Name: "ROBUX", Preferred: false },
]

const PaymentRules = [
	"50% upfront, 50% on delivery.",
	"paypal is preferred. if it isn't available to you, we can talk about other ways to pay.",
	"once work on a commission begins, there are no refunds.",
	"paying in robux? you cover the 30% marketplace tax. R$350 = $1.",
	"rush delivery is +25%.",
	"everything is built to match your game's style.",
	"% work is negotiable.",
]

let Context = null
let Tabs = null
let Content = null
let ActiveTab = 0
let RequestNodes = null

function BuildTier(Tier) {
	const Card = Create("div", "Tier")
	const Head = Create("div", "TierHead")
	Head.appendChild(Create("h4", null, Tier.Name))
	Head.appendChild(Create("b", "TierPrice", Tier.Price))
	Card.appendChild(Head)
	Card.appendChild(Create("small", null, Tier.Scope))
	if (Tier.Note) Card.appendChild(Create("p", null, Tier.Note))
	return Card
}

function BuildRates() {
	const Quote = Create("p", "Quote")
	Quote.appendChild(Create("b", null, "dm for inquiries. "))
	Quote.appendChild(document.createTextNode(QuoteText))

	const Groups = RateGroups.map(function (Group) {
		const Section = Create("section", "RateGroup")
		const Head = Create("div", "RateHead")
		Head.appendChild(Create("h3", null, Group.Title))
		Head.appendChild(Create("span", null, Group.Detail))
		const Grid = Create("div", "Tiers")
		Group.Tiers.forEach(function (Tier) { Grid.appendChild(BuildTier(Tier)) })
		Section.appendChild(Head)
		Section.appendChild(Grid)
		return Section
	})
	return [Quote, ...Groups]
}

function BuildIcon(Source) {
	const Icon = Create("img", "PaymentIcon")
	Icon.src = Source
	Icon.alt = ""
	return Icon
}

function BuildCurrency(Currency) {
	const Chip = Create("span", "Currency")
	if (Currency.Emoji) Chip.appendChild(Create("span", "CurrencyEmoji", Currency.Emoji))
	if (Currency.Icon) Chip.appendChild(BuildIcon(Currency.Icon))
	Chip.appendChild(Create("b", null, Currency.Name))
	if (Currency.Preferred) Chip.appendChild(Create("small", null, "PREFERRED"))
	return Chip
}

function BuildPayment() {
	const Row = Create("div", "Currencies")
	Currencies.forEach(function (Currency) { Row.appendChild(BuildCurrency(Currency)) })

	const PayPal = OpenExternal(Create("a", "PayPal"), PayPalUrl)
	PayPal.appendChild(BuildIcon("media/Icons/PayPal.svg"))
	PayPal.appendChild(document.createTextNode("PAY WITH PAYPAL"))

	const List = Create("ol", "Terms")
	PaymentRules.forEach(function (Rule) { List.appendChild(Create("li", null, Rule)) })
	return [Row, PayPal, List]
}

function BuildRequest() {
	if (RequestNodes === null) RequestNodes = BuildRequestForm(Context)
	return RequestNodes
}

const TabBuilders = [BuildRates, BuildPayment, BuildRequest]

function PickTab(Index) {
	ActiveTab = Wrap(Index, TabLabels.length)
	Tabs.Select(ActiveTab)
	Content.replaceChildren(...TabBuilders[ActiveTab]())
}

function ChooseTab(Index) {
	PickTab(Index)
	Context.Sounds.Tab()
}

const KeyHandlers = {
	ArrowLeft: function () { ChooseTab(ActiveTab - 1) },
	ArrowRight: function () { ChooseTab(ActiveTab + 1) },
}

export const Name = "Commissions"

export function Mount(Root, SharedContext) {
	Context = SharedContext
	const Body = BuildPage(Root, "Commissions", "DM FOR INQUIRIES")
	Tabs = BuildTabs(TabLabels, ChooseTab)
	Content = Create("div", "CommissionContent")
	Body.appendChild(Tabs.Row)
	Body.appendChild(Content)
	PickTab(0)
}

export function OnKey(Key) {
	const Handler = KeyHandlers[Key]
	if (!Handler) return false
	Handler()
	return true
}
