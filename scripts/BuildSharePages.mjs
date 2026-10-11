import { execFileSync } from "node:child_process"
import Fs from "node:fs"
import Path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { CleanWorks } from "../js/Data.js"

const SiteRoot = Path.resolve(Path.dirname(fileURLToPath(import.meta.url)), "..")
const PagesRoot = Path.join(SiteRoot, "works")
const SiteUrl = "https://oasislua.site"
const ThemeColor = "#7fe8ff"

function Escape(Value) {
	return String(Value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function VideoSize(VideoPath) {
	const Output = execFileSync("ffprobe", [
		"-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0",
		Path.join(SiteRoot, VideoPath),
	], { encoding: "utf8" })
	const [Width, Height] = Output.trim().split(",").map(Number)
	return { Width: Width, Height: Height }
}

export function SharePage(Work, Size) {
	const PageUrl = SiteUrl + "/works/" + Work.Slug + "/"
	const VideoUrl = SiteUrl + "/" + Work.Video
	const Description = [Work.Category, Work.Game, Work.Note].filter(Boolean).join(" / ")
	const Target = "/#works/" + Work.Slug
	const Tags = [
		["property", "og:type", "video.other"],
		["property", "og:site_name", "OASIS"],
		["property", "og:url", PageUrl],
		["property", "og:title", Work.Title],
		["property", "og:description", Description],
		["property", "og:image", SiteUrl + "/" + Work.Poster],
		["property", "og:video", VideoUrl],
		["property", "og:video:secure_url", VideoUrl],
		["property", "og:video:type", "video/mp4"],
		["property", "og:video:width", Size.Width],
		["property", "og:video:height", Size.Height],
		["name", "twitter:card", "player"],
		["name", "twitter:title", Work.Title],
		["name", "twitter:player", VideoUrl],
		["name", "twitter:player:width", Size.Width],
		["name", "twitter:player:height", Size.Height],
		["name", "twitter:player:stream", VideoUrl],
		["name", "twitter:player:stream:content_type", "video/mp4"],
		["name", "theme-color", ThemeColor],
	]
	const MetaLines = Tags.map(function (Tag) {
		return "<meta " + Tag[0] + "=\"" + Tag[1] + "\" content=\"" + Escape(Tag[2]) + "\">"
	})

	return [
		"<!DOCTYPE html>",
		"<html lang=\"en\">",
		"<head>",
		"<meta charset=\"utf-8\">",
		"<title>" + Escape(Work.Title) + " | OASIS</title>",
		...MetaLines,
		"<link rel=\"canonical\" href=\"" + PageUrl + "\">",
		"<meta http-equiv=\"refresh\" content=\"0; url=" + Target + "\">",
		"</head>",
		"<body><a href=\"" + Target + "\">" + Escape(Work.Title) + "</a></body>",
		"</html>",
		"",
	].join("\n")
}

function Main() {
	const Works = CleanWorks(JSON.parse(Fs.readFileSync(Path.join(SiteRoot, "data", "Works.json"), "utf8")))
		.filter(function (Work) { return Work.Video !== null && Work.Poster !== null })

	Fs.rmSync(PagesRoot, { recursive: true, force: true })
	for (const Work of Works) {
		const Folder = Path.join(PagesRoot, Work.Slug)
		Fs.mkdirSync(Folder, { recursive: true })
		Fs.writeFileSync(Path.join(Folder, "index.html"), SharePage(Work, VideoSize(Work.Video)))
	}
	console.log("Share pages written: " + Works.length)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	Main()
}
