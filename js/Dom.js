export function Create(Tag, ClassName, Text) {
	const Created = document.createElement(Tag)
	if (ClassName) Created.className = ClassName
	if (Text !== undefined && Text !== null) Created.textContent = Text
	return Created
}

export function BuildPage(Root, Title, Subtitle) {
	const Page = Create("div", "Page")
	const Heading = Create("h2", "PageTitle", Title)
	Heading.appendChild(Create("span", null, Subtitle))
	const Body = Create("div", "PageBody")

	Page.appendChild(Heading)
	Page.appendChild(Body)
	Root.appendChild(Page)
	return Body
}

export function BuildEmpty(Text) {
	return Create("p", "Empty", Text)
}

export function BuildTabs(Labels, OnPick) {
	const Row = Create("div", "Tabs")
	Row.setAttribute("role", "tablist")

	const Buttons = Labels.map(function (Label, Index) {
		const Button = Create("button", "Tab", Label)
		Button.setAttribute("role", "tab")
		Button.addEventListener("click", function () { OnPick(Index) })
		Row.appendChild(Button)
		return Button
	})

	function Select(Index) {
		Buttons.forEach(function (Button, ButtonIndex) {
			Button.classList.toggle("Active", ButtonIndex === Index)
			Button.setAttribute("aria-selected", String(ButtonIndex === Index))
		})
	}

	return { Row: Row, Select: Select }
}

export function OpenExternal(Anchor, Url) {
	Anchor.href = Url
	Anchor.target = "_blank"
	Anchor.rel = "noopener noreferrer"
	return Anchor
}

export function Wrap(Index, Length) {
	return (Index + Length) % Length
}
