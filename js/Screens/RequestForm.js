import { Create } from "../Dom.js"
import { FormatPrice } from "../Format.js"

const OtherKind = "Other"
const MaxQuantity = 20
const MaxFiles = 10
const MaxFileBytes = 20000000
const MaxTotalBytes = 60000000
const AcceptedFiles = "image/png,image/jpeg,image/gif,image/webp,video/mp4,video/quicktime,video/webm,application/pdf,text/plain"
const SentMessage = "sent! i'll message you on discord soon."
const FailedMessage = "couldn't send that. dm me on discord instead."
const SendingMessage = "sending..."
const NothingPickedMessage = "pick at least one thing you need, or tick other."
const EstimateNote = "starting price. the final quote depends on scope, i'll confirm it before starting."

function FormatBytes(Bytes) {
	return Bytes < 1000000 ? Math.ceil(Bytes / 1000) + " KB" : (Bytes / 1000000).toFixed(1) + " MB"
}

function BuildLabel(Text, Hint) {
	const Label = Create("span", "FormLabel", Text)
	if (Hint) Label.appendChild(Create("small", null, Hint))
	return Label
}

function BuildField(LabelText, Control, Hint) {
	const Field = Create("label", "FormField")
	Field.appendChild(BuildLabel(LabelText, Hint))
	Field.appendChild(Control)
	return Field
}

function BuildInput(Name, Type, MaxLength, Placeholder) {
	const Input = Create("input", "FormInput")
	Input.name = Name
	Input.type = Type
	Input.maxLength = MaxLength
	Input.placeholder = Placeholder
	Input.autocomplete = "off"
	return Input
}

function BuildStepper(Item, OnChange) {
	const Row = Create("div", "PickRow")
	const Info = Create("div", "PickInfo")
	Info.appendChild(Create("b", null, Item.Name))
	Info.appendChild(Create("small", null, FormatPrice(Item.Price) + " " + Item.Scope.toLowerCase()))

	const Controls = Create("div", "Stepper")
	const Minus = Create("button", "StepButton", "-")
	const Count = Create("span", "StepCount", "0")
	const Plus = Create("button", "StepButton", "+")
	Minus.type = "button"
	Plus.type = "button"
	Minus.setAttribute("aria-label", "fewer " + Item.Name)
	Plus.setAttribute("aria-label", "more " + Item.Name)

	function SetQuantity(Value) {
		Item.Quantity = Math.min(MaxQuantity, Math.max(0, Value))
		Count.textContent = String(Item.Quantity)
		Row.classList.toggle("Picked", Item.Quantity > 0)
		OnChange()
	}

	Minus.addEventListener("click", function () { SetQuantity(Item.Quantity - 1) })
	Plus.addEventListener("click", function () { SetQuantity(Item.Quantity + 1) })
	Controls.appendChild(Minus)
	Controls.appendChild(Count)
	Controls.appendChild(Plus)
	Row.appendChild(Info)
	Row.appendChild(Controls)
	return { Row: Row, Reset: function () { SetQuantity(0) } }
}

function BuildPicker(Rates, Items, OnChange) {
	const Picker = Create("div", "Picker")
	Picker.appendChild(BuildLabel("WHAT DO YOU NEED?", "pick a type, then how many"))
	const Chips = Create("div", "PickChips")
	const Lists = Create("div")
	const Steppers = []

	Rates.Groups.forEach(function (Group) {
		const Chip = Create("button", "PickChip", Group.Title)
		Chip.type = "button"
		const List = Create("div", "PickList")
		List.hidden = true
		Group.Tiers.forEach(function (Tier) {
			const Item = { Kind: Group.Kind, Group: Group.Title, Name: Tier.Name, Price: Tier.Price, Scope: Tier.Scope, Quantity: 0 }
			Items.push(Item)
			const Stepper = BuildStepper(Item, OnChange)
			Steppers.push(Stepper)
			List.appendChild(Stepper.Row)
		})
		Chip.addEventListener("click", function () {
			List.hidden = !List.hidden
			Chip.classList.toggle("Open", !List.hidden)
		})
		Chips.appendChild(Chip)
		Lists.appendChild(List)
	})

	const Other = Create("label", "KindOption")
	const OtherBox = Create("input")
	OtherBox.type = "checkbox"
	OtherBox.name = "Kinds"
	OtherBox.value = OtherKind
	OtherBox.addEventListener("change", OnChange)
	Other.appendChild(OtherBox)
	Other.appendChild(Create("span", null, "OTHER"))
	Chips.appendChild(Other)

	Picker.appendChild(Chips)
	Picker.appendChild(Lists)
	return {
		Element: Picker,
		Other: OtherBox,
		Reset: function () { Steppers.forEach(function (Stepper) { Stepper.Reset() }) },
	}
}

function OrderLines(Items) {
	return Items
		.filter(function (Item) { return Item.Quantity > 0 })
		.map(function (Item) {
			return { Text: Item.Quantity + " x " + Item.Name + " " + Item.Group, Cost: Item.Quantity * Item.Price }
		})
}

function EstimateTotal(Items, Rush, RushPercent) {
	const Subtotal = OrderLines(Items).reduce(function (Sum, Line) { return Sum + Line.Cost }, 0)
	return Rush ? Subtotal * (1 + RushPercent / 100) : Subtotal
}

function BuildEstimate(RushPercent, OnChange) {
	const Panel = Create("aside", "Estimate")
	Panel.appendChild(Create("span", "FormLabel", "ESTIMATE"))
	const Lines = Create("ul", "EstimateLines")
	const Rush = Create("label", "KindOption EstimateRush")
	const RushBox = Create("input")
	RushBox.type = "checkbox"
	RushBox.name = "Rush"
	RushBox.value = "yes"
	RushBox.addEventListener("change", OnChange)
	Rush.appendChild(RushBox)
	Rush.appendChild(Create("span", null, "RUSH +" + RushPercent + "%"))
	const Total = Create("b", "EstimateTotal", "$0")
	Panel.appendChild(Lines)
	Panel.appendChild(Rush)
	Panel.appendChild(Total)
	Panel.appendChild(Create("small", "EstimateNote", EstimateNote))
	return { Element: Panel, Lines: Lines, Total: Total, Rush: RushBox }
}

function RenderEstimate(Estimate, Items, RushPercent) {
	const Lines = OrderLines(Items)
	Estimate.Lines.replaceChildren(...Lines.map(function (Line) {
		const Row = Create("li")
		Row.appendChild(Create("span", null, Line.Text))
		Row.appendChild(Create("span", null, FormatPrice(Line.Cost)))
		return Row
	}))
	if (Lines.length === 0) Estimate.Lines.appendChild(Create("li", "EstimateEmpty", "nothing picked yet"))
	Estimate.Total.textContent = "from " + FormatPrice(EstimateTotal(Items, Estimate.Rush.checked, RushPercent))
}

function BuildDropZone() {
	const Picked = []
	const Zone = Create("div", "DropZone")
	const Input = Create("input", "DropInput")
	Input.type = "file"
	Input.multiple = true
	Input.accept = AcceptedFiles
	Input.setAttribute("aria-label", "add attachments")
	const Prompt = Create("p", "DropPrompt", "drop files here or click to add")
	const Chips = Create("ul", "FileChips")

	function Render() {
		Chips.replaceChildren(...Picked.map(function (Upload, Index) {
			const Chip = Create("li", "FileChip")
			Chip.appendChild(Create("span", null, Upload.name + " (" + FormatBytes(Upload.size) + ")"))
			const Remove = Create("button", "FileRemove", "x")
			Remove.type = "button"
			Remove.setAttribute("aria-label", "remove " + Upload.name)
			Remove.addEventListener("click", function () {
				Picked.splice(Index, 1)
				Render()
			})
			Chip.appendChild(Remove)
			return Chip
		}))
	}

	function Add(Incoming) {
		Array.from(Incoming).forEach(function (Upload) { Picked.push(Upload) })
		Input.value = ""
		Render()
	}

	Input.addEventListener("change", function () { Add(Input.files) })
	Zone.addEventListener("dragover", function (DragEvent) {
		DragEvent.preventDefault()
		Zone.classList.add("Over")
	})
	Zone.addEventListener("dragleave", function () { Zone.classList.remove("Over") })
	Zone.addEventListener("drop", function (DropEvent) {
		DropEvent.preventDefault()
		Zone.classList.remove("Over")
		Add(DropEvent.dataTransfer.files)
	})

	Zone.appendChild(Input)
	Zone.appendChild(Prompt)
	const Wrapper = Create("div")
	Wrapper.appendChild(Zone)
	Wrapper.appendChild(Chips)
	return {
		Element: Wrapper,
		Files: Picked,
		Clear: function () {
			Picked.length = 0
			Render()
		},
	}
}

function AttachmentProblem(Files) {
	const Total = Files.reduce(function (Sum, Upload) { return Sum + Upload.size }, 0)
	const TooBig = Files.find(function (Upload) { return Upload.size > MaxFileBytes })
	if (Files.length > MaxFiles) return "attach " + MaxFiles + " files or fewer."
	if (TooBig) return TooBig.name + " is over 20 MB. paste a link to it instead."
	if (Total > MaxTotalBytes) return "attachments must add up to 60 MB or less."
	return null
}

function BuildHoneypot() {
	const Trap = Create("input", "FormTrap")
	Trap.name = "Website"
	Trap.type = "text"
	Trap.tabIndex = -1
	Trap.autocomplete = "off"
	Trap.setAttribute("aria-hidden", "true")
	return Trap
}

function BuildPayload(Form, Items, Drop, Estimate, RushPercent) {
	const Payload = new FormData(Form)
	const Kinds = Items
		.filter(function (Item) { return Item.Quantity > 0 })
		.map(function (Item) { return Item.Kind })
	new Set(Kinds).forEach(function (Kind) { Payload.append("Kinds", Kind) })
	Payload.append("Order", OrderLines(Items).map(function (Line) {
		return Line.Text + " " + FormatPrice(Line.Cost)
	}).join("\n"))
	Payload.append("Estimate", "from " + FormatPrice(EstimateTotal(Items, Estimate.Rush.checked, RushPercent)))
	Drop.Files.forEach(function (Upload) { Payload.append("Files", Upload) })
	return Payload
}

async function Submit(Url, Payload) {
	try {
		const Reply = await fetch(Url, { method: "POST", body: Payload })
		const Result = await Reply.json()
		if (Result && Result.Accepted === true) return null
		return Result && Result.Reason ? Result.Reason : FailedMessage
	} catch {
		return FailedMessage
	}
}

export function BuildRequestForm(Context) {
	const Url = Context.Site.CommissionUrl
	if (!Url) return [Create("p", "Empty", "requests are closed right now, dm me on discord.")]

	const RushPercent = Context.Rates.RushPercent
	const Items = []
	const Form = Create("form", "RequestForm")
	Form.noValidate = true

	function Refresh() {
		RenderEstimate(Estimate, Items, RushPercent)
	}

	const Estimate = BuildEstimate(RushPercent, Refresh)
	const Picker = BuildPicker(Context.Rates, Items, Refresh)
	const Drop = BuildDropZone()
	const Discord = BuildInput("Discord", "text", 37, "your username, not display name")
	const Details = Create("textarea", "FormInput FormDetails")
	Details.name = "Details"
	Details.maxLength = 2000
	Details.placeholder = "what it's for, how it should feel, anything i should know"
	const Status = Create("p", "FormStatus")
	Status.setAttribute("role", "status")
	const Send = Create("button", "FormSend", "SEND REQUEST")
	Send.type = "submit"

	const Row = Create("div", "FormRow")
	Row.appendChild(BuildField("DEADLINE", BuildInput("Deadline", "text", 80, "e.g. end of the month"), "optional"))
	Row.appendChild(BuildField("LINK", BuildInput("Link", "url", 300, "game, references or a big video"), "optional"))

	const Main = Create("div", "RequestMain")
	Main.appendChild(BuildField("DISCORD USERNAME", Discord))
	Main.appendChild(Picker.Element)
	Main.appendChild(BuildField("DESCRIBE WHAT YOU NEED", Details))
	const Attachments = Create("div", "FormField")
	Attachments.appendChild(BuildLabel("ATTACHMENTS", "up to 10 files, 20 MB each"))
	Attachments.appendChild(Drop.Element)
	Main.appendChild(Attachments)
	Main.appendChild(Row)
	Main.appendChild(BuildHoneypot())
	Main.appendChild(Send)
	Main.appendChild(Status)

	Form.appendChild(Main)
	Form.appendChild(Estimate.Element)
	Refresh()

	Form.addEventListener("submit", async function (SubmitEvent) {
		SubmitEvent.preventDefault()
		const HasItems = OrderLines(Items).length > 0
		const Problem = !HasItems && !Picker.Other.checked ? NothingPickedMessage : AttachmentProblem(Drop.Files)
		if (Problem) {
			Status.textContent = Problem
			return
		}

		Send.disabled = true
		Status.textContent = SendingMessage
		const Failure = await Submit(Url, BuildPayload(Form, Items, Drop, Estimate, RushPercent))
		Send.disabled = false
		if (Failure) {
			Status.textContent = Failure
			return
		}

		Context.Sounds.Select()
		Form.reset()
		Picker.Reset()
		Drop.Clear()
		Refresh()
		Status.textContent = SentMessage
	})

	return [Form]
}
