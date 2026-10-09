import { Create } from "./Dom.js"

const VolumeKey = "OasisVolume"
const DefaultVolume = 0.35
const BlipVolume = 0.12
const PlayIcon = "<svg viewBox=\"0 0 12 14\" aria-hidden=\"true\"><path d=\"M0 0l12 7-12 7z\"/></svg>"
const PauseIcon = "<svg viewBox=\"0 0 12 14\" aria-hidden=\"true\"><path d=\"M0 0h4v14H0zM8 0h4v14H8z\"/></svg>"
const Blips = {
	Move: { From: 900, To: 1300, Seconds: 0.045, Gain: 0.5 },
	Select: { From: 640, To: 1700, Seconds: 0.09, Gain: 0.7 },
	Back: { From: 1000, To: 420, Seconds: 0.07, Gain: 0.6 },
}

function ReadVolume() {
	try {
		const Stored = window.localStorage.getItem(VolumeKey)
		const Parsed = Number(Stored)
		return Stored !== null && Number.isFinite(Parsed) ? Math.min(1, Math.max(0, Parsed)) : DefaultVolume
	} catch {
		return DefaultVolume
	}
}

function SaveVolume(Volume) {
	try {
		window.localStorage.setItem(VolumeKey, String(Volume))
	} catch {
		return
	}
}

function BuildWidget(Root, Track, Volume) {
	const Toggle = Create("button", "PlayerToggle")
	Toggle.innerHTML = PlayIcon
	Toggle.setAttribute("aria-label", "play music")

	const Info = Create("div", "PlayerInfo")
	Info.appendChild(Create("span", "PlayerLabel", "NOW PLAYING"))
	Info.appendChild(Create("b", "PlayerTitle", Track.Title))
	Info.appendChild(Create("span", "PlayerArtist", Track.Artist))
	const Bar = Create("div", "PlayerBar")
	const Fill = Create("i", "PlayerFill")
	Bar.appendChild(Fill)
	Info.appendChild(Bar)

	const Range = Create("input", "PlayerVolume")
	Range.type = "range"
	Range.min = "0"
	Range.max = "100"
	Range.value = String(Math.round(Volume * 100))
	Range.setAttribute("aria-label", "music volume")

	Root.appendChild(Toggle)
	Root.appendChild(Info)
	Root.appendChild(Range)
	return { Toggle: Toggle, Fill: Fill, Range: Range }
}

export function CreateSounds(Track, Root) {
	let Volume = ReadVolume()
	let Context = null
	let Ducked = false
	let Unlocked = false

	if (!Track.File) {
		Root.hidden = true
		return { Unlock: function () {}, Move: function () {}, Select: function () {}, Back: function () {},
			Duck: function () {}, Unduck: function () {}, IsMuted: function () { return true } }
	}

	const Music = new Audio(Track.File)
	Music.loop = true
	Music.preload = "none"
	Music.volume = Volume
	const Widget = BuildWidget(Root, Track, Volume)

	function Play() {
		Music.play().catch(function () { return })
	}

	function PlayBlip(Name) {
		if (!Context || Music.paused) return
		const Blip = Blips[Name]
		const Now = Context.currentTime
		const Oscillator = Context.createOscillator()
		const Gain = Context.createGain()

		Oscillator.type = "sine"
		Oscillator.frequency.setValueAtTime(Blip.From, Now)
		Oscillator.frequency.exponentialRampToValueAtTime(Blip.To, Now + Blip.Seconds)
		Gain.gain.setValueAtTime(Blip.Gain * BlipVolume * Volume, Now)
		Gain.gain.exponentialRampToValueAtTime(0.0001, Now + Blip.Seconds)
		Oscillator.connect(Gain)
		Gain.connect(Context.destination)
		Oscillator.start(Now)
		Oscillator.stop(Now + Blip.Seconds + 0.02)
	}

	Widget.Toggle.addEventListener("click", function () {
		Ducked = false
		if (Music.paused) Play()
		else Music.pause()
	})
	function ShowPaused() {
		Widget.Toggle.innerHTML = PlayIcon
		Widget.Toggle.setAttribute("aria-label", "play music")
		Root.classList.remove("Playing")
	}

	Music.addEventListener("playing", function () {
		Widget.Toggle.innerHTML = PauseIcon
		Widget.Toggle.setAttribute("aria-label", "pause music")
		Root.classList.add("Playing")
	})
	Music.addEventListener("pause", ShowPaused)
	Music.addEventListener("error", ShowPaused)
	Music.addEventListener("timeupdate", function () {
		const Progress = Music.duration > 0 ? Music.currentTime / Music.duration : 0
		Widget.Fill.style.transform = "scaleX(" + Progress + ")"
	})
	Widget.Range.addEventListener("input", function () {
		const Level = Number(Widget.Range.value) / 100
		Volume = Number.isFinite(Level) ? Level : 0
		Music.volume = Volume
		SaveVolume(Volume)
	})

	return {
		Unlock: function () {
			if (Unlocked) return
			Unlocked = true
			const AudioContextClass = window.AudioContext || window.webkitAudioContext
			if (AudioContextClass) Context = new AudioContextClass()
			Play()
		},
		Move: function () { PlayBlip("Move") },
		Select: function () { PlayBlip("Select") },
		Back: function () { PlayBlip("Back") },
		Duck: function () {
			if (Music.paused) return
			Ducked = true
			Music.pause()
		},
		Unduck: function () {
			if (!Ducked) return
			Ducked = false
			Play()
		},
		IsMuted: function () { return Music.paused },
	}
}
