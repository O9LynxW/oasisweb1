import Path from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "@playwright/test"

const SiteRoot = Path.resolve(Path.dirname(fileURLToPath(import.meta.url)), "..")
const OutputPath = Path.join(SiteRoot, "media", "Preview.jpg")
const Width = 1200
const Height = 630
const VisitsLabel = "830M+"

const Markup = `<!DOCTYPE html>
<html>
<head>
<link href="https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@700;800;900&display=block" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${Width}px;height:${Height}px;overflow:hidden;font-family:"Saira Condensed",sans-serif;color:#fff;
	background:linear-gradient(140deg,#040d2b 0%,#0a2466 45%,#1452c8 100%);position:relative}
.Streak{position:absolute;left:-20%;width:140%;height:120px;top:62%;transform:rotate(-16deg);
	background:linear-gradient(90deg,transparent,rgba(127,232,255,.22),rgba(255,255,255,.12),transparent)}
.Bar{position:absolute;left:-40px;top:262px;width:800px;height:172px;background:#fff;transform:rotate(-7deg);
	clip-path:polygon(0 0,100% 0,94% 100%,0 100%)}
.Underline{position:absolute;left:-40px;top:420px;width:760px;height:12px;background:#7fe8ff;transform:rotate(-7deg);
	clip-path:polygon(0 0,100% 0,96% 100%,0 100%)}
.Name{position:absolute;left:60px;top:250px;font-weight:900;font-style:italic;font-size:210px;line-height:.8;
	color:#040d2b;transform:rotate(-7deg)}
.Role{position:absolute;left:66px;top:96px;font-weight:700;font-size:30px;letter-spacing:.32em;color:#7fe8ff}
.Stat{position:absolute;right:70px;bottom:70px;text-align:right}
.Stat b{display:block;font-weight:800;font-style:italic;font-size:110px;line-height:.9;text-shadow:6px 6px 0 #040d2b}
.Stat small{font-weight:700;font-size:26px;letter-spacing:.3em;color:#cfe4ff}
.Site{position:absolute;right:70px;top:90px;font-weight:800;font-style:italic;font-size:34px;letter-spacing:.06em;color:#cfe4ff}
</style>
</head>
<body>
<div class="Streak"></div>
<div class="Role">SCRIPTER / VFX / UI / SFX</div>
<div class="Site">OASISLUA.SITE</div>
<div class="Bar"></div>
<div class="Underline"></div>
<div class="Name">OASIS</div>
<div class="Stat"><b>${VisitsLabel}</b><small>VISITS ACROSS GAMES WORKED ON</small></div>
</body>
</html>`

const Browser = await chromium.launch({ channel: "chrome" })
const Page = await Browser.newPage({ viewport: { width: Width, height: Height } })
await Page.setContent(Markup, { waitUntil: "networkidle" })
await Page.evaluate(function () { return document.fonts.ready })
await Page.screenshot({ path: OutputPath, type: "jpeg", quality: 90 })
await Browser.close()
console.log("Preview written to " + OutputPath)
