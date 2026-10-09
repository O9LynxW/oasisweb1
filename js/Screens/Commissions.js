import { Create, BuildPage, BuildEmpty, BuildTabs, Wrap } from "../Dom.js"

const TabLabels = ["BOARD", "RATES", "TERMS"]
const QuoteText = "every job is quoted on scope, references and deadline, so the tiers are there to show what a job " +
	"looks like rather than a fixed price list. message me with what you need and i'll give you a number."

const RateGroups = [
	{
		Title: "VFX",
		Detail: "particles, meshes, beams, trails, custom textures",
		Tiers: [
			{ Name: "Skill VFX", Scope: "ONE MOVE", Note: "a full skill effect with startup, active and impact stages. the standard job for one move.",
				Points: ["timed multi stage sequence", "custom textures and meshes", "camera shake and sound cues", "2 revisions"] },
			{ Name: "Advanced", Scope: "BIGGER SKILLS", Note: "heavier skills with more moving parts and longer sequences.",
				Points: ["beams, projectiles, ground reactions", "custom modelled and textured assets",
					"multi hit and follow up stages", "3 revisions"] },
			{ Name: "Moveset Pack", Scope: "4 TO 6 SKILLS", Note: "4 to 6 skills built as one visually consistent kit.",
				Points: ["shared colour and texture language", "built and delivered as one batch",
					"bundle rate, well under buying singles"] },
		],
	},
	{
		Title: "SCRIPTING",
		Detail: "combat, skills, replication, frameworks",
		Tiers: [
			{ Name: "Small Task", Scope: "SAME OR NEXT DAY", Note: "bug fixes and small standalone systems.",
				Points: ["shops, ui logic, datastore fixes", "works inside your existing codebase"] },
			{ Name: "Skill", Scope: "UP TO 2 DAYS", Note: "one complete skill, client and server, vfx wired in.",
				Points: ["server authoritative hitboxes", "cooldowns, stuns, status effects",
					"replicated animation and effects", "2 revisions"] },
			{ Name: "System", Scope: "UP TO A WEEK", Note: "a full gameplay system built to fit your game.",
				Points: ["combat, stamina, blocking, parry", "round systems, inventories, saving", "documented and modular"] },
			{ Name: "Framework", Scope: "2 TO 3 WEEKS", Note: "a full combat framework other devs can build movesets on.",
				Points: ["skill and status effect api", "networking and anti exploit layer", "handover docs included",
					"retainer available"] },
		],
	},
]

const Terms = [
	"message me on discord with what you need, i quote it there.",
	"50% upfront, 50% on delivery. larger jobs can be split into milestones.",
	"robux is paid through a gamepass set high enough to cover the 30% tax.",
	"usd via paypal goods and services or crypto.",
	"revisions listed per tier, extra revisions are charged at 20% of the job.",
	"rush delivery is +50%.",
	"you own the final assets, i keep the right to show the work in my portfolio.",
]

const StatusPills = {
	Active: { Text: "WORKING ON IT", ClassName: "Active" },
	Done: { Text: "DELIVERED", ClassName: "Done" },
	Queued: { Text: "QUEUED", ClassName: "Queued" },
}

let Context = null
let Tabs = null
let Content = null
let ActiveTab = 0

function FormatDuration(Seconds) {
	const Hours = Math.floor(Seconds / 3600)
	const Minutes = Math.floor((Seconds % 3600) / 60)
	if (Hours === 0 && Minutes === 0) return "not started"
	if (Hours === 0) return Minutes + "m logged"
	return Hours + "h " + Minutes + "m logged"
}

function BuildJob(Job) {
	const Card = Create("article", "Job")
	const Pill = StatusPills[Job.Status]
	const Top = Create("div", "JobTop")
	const Headings = Create("div")
	Headings.appendChild(Create("h3", "JobTitle", Job.Project))
	Headings.appendChild(Create("small", "JobClient", Job.Client ? "for " + Job.Client : "private client"))
	Top.appendChild(Headings)
	Top.appendChild(Create("span", "JobPill " + Pill.ClassName, Pill.Text))
	Card.appendChild(Top)

	const DoneCount = Job.Tasks.filter(function (Task) { return Task.Done }).length
	const Progress = Job.Tasks.length === 0 ? 0 : DoneCount / Job.Tasks.length
	const Bar = Create("div", "JobBar")
	const Fill = Create("i", "JobFill")
	Fill.style.transform = "scaleX(" + Progress + ")"
	Bar.appendChild(Fill)
	Card.appendChild(Bar)

	if (Job.Tasks.length > 0) {
		const List = Create("ul", "JobTasks")
		Job.Tasks.forEach(function (Task) {
			List.appendChild(Create("li", Task.Done ? "Complete" : null, Task.Label))
		})
		Card.appendChild(List)
	}

	const Foot = Create("div", "JobFoot")
	Foot.appendChild(Create("span", null, Job.Tasks.length === 0 ? "no tasks listed" : DoneCount + " of " + Job.Tasks.length + " done"))
	Foot.appendChild(Create("b", null, FormatDuration(Job.LoggedSeconds)))
	Card.appendChild(Foot)
	return Card
}

function BuildBoard() {
	const Visible = (Context.Jobs || []).filter(function (Job) { return Job.Status !== "Hidden" })
	if (Visible.length === 0) return [BuildEmpty("nothing on the board right now, slots are open.")]
	return Visible.map(BuildJob)
}

function BuildTier(Tier) {
	const Card = Create("div", "Tier")
	Card.appendChild(Create("h4", null, Tier.Name))
	Card.appendChild(Create("small", null, Tier.Scope))
	Card.appendChild(Create("p", null, Tier.Note))
	const List = Create("ul")
	Tier.Points.forEach(function (Point) { List.appendChild(Create("li", null, Point)) })
	Card.appendChild(List)
	return Card
}

function BuildRates() {
	const Quote = Create("p", "Quote")
	Quote.appendChild(Create("b", null, "pricing is discussed in dms. "))
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

function BuildTerms() {
	const List = Create("ol", "Terms")
	Terms.forEach(function (Term) { List.appendChild(Create("li", null, Term)) })
	return [List]
}

const TabBuilders = [BuildBoard, BuildRates, BuildTerms]

function PickTab(Index) {
	ActiveTab = Wrap(Index, TabLabels.length)
	Tabs.Select(ActiveTab)
	Content.replaceChildren(...TabBuilders[ActiveTab]())
}

function StepTab(Step) {
	PickTab(ActiveTab + Step)
	Context.Sounds.Move()
}

const KeyHandlers = {
	ArrowLeft: function () { StepTab(-1) },
	ArrowRight: function () { StepTab(1) },
}

export const Name = "Commissions"

export function Mount(Root, SharedContext) {
	Context = SharedContext
	const Body = BuildPage(Root, "Commissions", "PRICING IN DMS")
	Tabs = BuildTabs(TabLabels, PickTab)
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
