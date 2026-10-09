import { Create, BuildPage, BuildTabs, OpenExternal, Wrap } from "../Dom.js"
import { FormatPrice } from "../Format.js"
import { BuildRequestForm } from "./RequestForm.js"

const TabLabels = ["RATES", "PAYMENT", "REQUEST"]
const QuoteText = "price depends on scope, i'll explain any change before starting it."
const PayPalUrl = "https://paypal.me/oasis098"

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
	Head.appendChild(Create("b", "TierPrice", FormatPrice(Tier.Price)))
	Card.appendChild(Head)
	Card.appendChild(Create("small", null, Tier.Scope))
	if (Tier.Note) Card.appendChild(Create("p", null, Tier.Note))
	return Card
}

function BuildRates() {
	const Quote = Create("p", "Quote")
	Quote.appendChild(Create("b", null, "dm for inquiries. "))
	Quote.appendChild(document.createTextNode(QuoteText))

	const Groups = Context.Rates.Groups.map(function (Group) {
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
	const Rules = PaymentRules.concat("rush delivery is +" + Context.Rates.RushPercent + "%.")
	Rules.forEach(function (Rule) { List.appendChild(Create("li", null, Rule)) })
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
