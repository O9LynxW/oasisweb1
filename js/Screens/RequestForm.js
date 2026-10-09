import { Create } from "../Dom.js"

const Kinds = ["Scripting", "VFX", "SFX", "UI", "Other"]
const AcceptedFiles = "image/png,image/jpeg,image/gif,image/webp,video/mp4,video/quicktime,video/webm,application/pdf,text/plain"
const MaxFiles = 4
const MaxFileBytes = 9000000
const SentMessage = "sent! i'll message you on discord soon."
const FailedMessage = "couldn't send that. dm me on discord instead."
const SendingMessage = "sending..."

function BuildField(LabelText, Control, Hint) {
	const Field = Create("label", "FormField")
	const Label = Create("span", "FormLabel", LabelText)
	if (Hint) Label.appendChild(Create("small", null, Hint))
	Field.appendChild(Label)
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

function BuildKinds() {
	const Group = Create("fieldset", "FormKinds")
	Group.appendChild(Create("legend", "FormLabel", "WHAT ARE YOU COMMISSIONING?"))
	Kinds.forEach(function (Kind) {
		const Option = Create("label", "KindOption")
		const Box = Create("input")
		Box.type = "checkbox"
		Box.name = "Kinds"
		Box.value = Kind
		Option.appendChild(Box)
		Option.appendChild(Create("span", null, Kind.toUpperCase()))
		Group.appendChild(Option)
	})
	return Group
}

function FormatBytes(Bytes) {
	return Bytes < 1000000 ? Math.ceil(Bytes / 1000) + " KB" : (Bytes / 1000000).toFixed(1) + " MB"
}

function BuildAttachments() {
	const Input = Create("input", "FormFiles")
	Input.type = "file"
	Input.name = "Files"
	Input.multiple = true
	Input.accept = AcceptedFiles
	const List = Create("ul", "FileList")

	Input.addEventListener("change", function () {
		const Files = Array.from(Input.files)
		List.replaceChildren(...Files.map(function (Upload) {
			return Create("li", null, Upload.name + " (" + FormatBytes(Upload.size) + ")")
		}))
	})

	const Wrapper = Create("div")
	Wrapper.appendChild(Input)
	Wrapper.appendChild(List)
	return { Wrapper: Wrapper, Input: Input, List: List }
}

function AttachmentProblem(Input) {
	const Files = Array.from(Input.files)
	const Total = Files.reduce(function (Sum, Upload) { return Sum + Upload.size }, 0)
	if (Files.length > MaxFiles) return "attach " + MaxFiles + " files or fewer."
	if (Total > MaxFileBytes) return "attachments must add up to 9 MB or less."
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

async function Submit(Form, Url) {
	try {
		const Reply = await fetch(Url, { method: "POST", body: new FormData(Form) })
		const Payload = await Reply.json()
		return Payload && Payload.Accepted === true ? null : (Payload && Payload.Reason) || FailedMessage
	} catch {
		return FailedMessage
	}
}

export function BuildRequestForm(Context) {
	const Url = Context.Site.CommissionUrl
	if (!Url) return [Create("p", "Empty", "requests are closed right now, dm me on discord.")]

	const Form = Create("form", "RequestForm")
	Form.noValidate = true
	const Discord = BuildInput("Discord", "text", 37, "your username, not display name")
	Discord.required = true
	const Details = Create("textarea", "FormInput FormDetails")
	Details.name = "Details"
	Details.maxLength = 2000
	Details.required = true
	Details.placeholder = "the moves, systems or effects you need, how it should feel, anything i should know"
	const Attachments = BuildAttachments()
	const Status = Create("p", "FormStatus")
	Status.setAttribute("role", "status")
	const Send = Create("button", "FormSend", "SEND REQUEST")
	Send.type = "submit"

	const Row = Create("div", "FormRow")
	Row.appendChild(BuildField("BUDGET", BuildInput("Budget", "text", 80, "e.g. $50 or 20k robux"), "optional"))
	Row.appendChild(BuildField("DEADLINE", BuildInput("Deadline", "text", 80, "e.g. end of the month"), "optional"))

	Form.appendChild(BuildField("DISCORD USERNAME", Discord))
	Form.appendChild(BuildKinds())
	Form.appendChild(BuildField("DESCRIBE WHAT YOU NEED", Details))
	Form.appendChild(BuildField("ATTACHMENTS", Attachments.Wrapper, "references, clips, screenshots. up to 4 files, 9 MB"))
	Form.appendChild(Row)
	Form.appendChild(BuildField("GAME OR REFERENCE LINK", BuildInput("Link", "url", 300, "https://"), "optional"))
	Form.appendChild(BuildHoneypot())
	Form.appendChild(Send)
	Form.appendChild(Status)

	Form.addEventListener("submit", async function (SubmitEvent) {
		SubmitEvent.preventDefault()
		const Problem = AttachmentProblem(Attachments.Input)
		if (Problem) {
			Status.textContent = Problem
			return
		}

		Send.disabled = true
		Status.textContent = SendingMessage
		const Failure = await Submit(Form, Url)
		Send.disabled = false
		if (Failure) {
			Status.textContent = Failure
			return
		}

		Context.Sounds.Select()
		Form.reset()
		Attachments.List.replaceChildren()
		Status.textContent = SentMessage
	})

	return [Form]
}
