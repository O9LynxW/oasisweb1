import Http from "node:http"
import Fs from "node:fs"
import Path from "node:path"
import { fileURLToPath } from "node:url"

const SiteRoot = Path.resolve(Path.dirname(fileURLToPath(import.meta.url)), "..")
const Port = Number(process.env.PORT || 4173)
const Types = {
	".html": "text/html; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".jpg": "image/jpeg",
	".png": "image/png",
	".svg": "image/svg+xml",
	".mp4": "video/mp4",
	".mp3": "audio/mpeg",
}

function Resolve(UrlPath) {
	const Clean = decodeURIComponent(UrlPath.split("?")[0])
	const Target = Path.join(SiteRoot, Clean === "/" ? "index.html" : Clean)
	return Target.startsWith(SiteRoot) ? Target : null
}

function SendRange(Outgoing, Target, Size, Range, Type) {
	const Match = /bytes=(\d*)-(\d*)/.exec(Range)
	const Start = Match && Match[1] ? Number(Match[1]) : 0
	const End = Match && Match[2] ? Math.min(Number(Match[2]), Size - 1) : Size - 1
	Outgoing.writeHead(206, {
		"Content-Type": Type,
		"Content-Range": "bytes " + Start + "-" + End + "/" + Size,
		"Accept-Ranges": "bytes",
		"Content-Length": End - Start + 1,
	})
	Fs.createReadStream(Target, { start: Start, end: End }).pipe(Outgoing)
}

Http.createServer(function (Incoming, Outgoing) {
	const Target = Resolve(Incoming.url)
	if (!Target || !Fs.existsSync(Target) || Fs.statSync(Target).isDirectory()) {
		Outgoing.writeHead(404)
		Outgoing.end("not found")
		return
	}

	const Size = Fs.statSync(Target).size
	const Type = Types[Path.extname(Target).toLowerCase()] || "application/octet-stream"
	if (Incoming.headers.range) {
		SendRange(Outgoing, Target, Size, Incoming.headers.range, Type)
		return
	}
	Outgoing.writeHead(200, { "Content-Type": Type, "Content-Length": Size, "Accept-Ranges": "bytes" })
	Fs.createReadStream(Target).pipe(Outgoing)
}).listen(Port, function () {
	console.log("Serving " + SiteRoot + " at http://localhost:" + Port + "/")
})
