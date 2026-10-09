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

function SendRange(Response, Target, Size, Range, Type) {
	const Match = /bytes=(\d*)-(\d*)/.exec(Range)
	const Start = Match && Match[1] ? Number(Match[1]) : 0
	const End = Match && Match[2] ? Math.min(Number(Match[2]), Size - 1) : Size - 1
	Response.writeHead(206, {
		"Content-Type": Type,
		"Content-Range": "bytes " + Start + "-" + End + "/" + Size,
		"Accept-Ranges": "bytes",
		"Content-Length": End - Start + 1,
	})
	Fs.createReadStream(Target, { start: Start, end: End }).pipe(Response)
}

Http.createServer(function (Request, Response) {
	const Target = Resolve(Request.url)
	if (!Target || !Fs.existsSync(Target) || Fs.statSync(Target).isDirectory()) {
		Response.writeHead(404)
		Response.end("not found")
		return
	}

	const Size = Fs.statSync(Target).size
	const Type = Types[Path.extname(Target).toLowerCase()] || "application/octet-stream"
	if (Request.headers.range) {
		SendRange(Response, Target, Size, Request.headers.range, Type)
		return
	}
	Response.writeHead(200, { "Content-Type": Type, "Content-Length": Size, "Accept-Ranges": "bytes" })
	Fs.createReadStream(Target).pipe(Response)
}).listen(Port, function () {
	console.log("Serving " + SiteRoot + " at http://localhost:" + Port + "/")
})
