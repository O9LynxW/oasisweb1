import { Create } from "./Dom.js"

const VolumeKey = "OasisVolume"
const DefaultVolume = 0.35
const UiVolume = 0.9
const UiFolder = "media/Audio/Ui/"
const PlayIcon = "<svg viewBox=\"0 0 12 14\" aria-hidden=\"true\"><path d=\"M0 0l12 7-12 7z\"/></svg>"
const PauseIcon = "<svg viewBox=\"0 0 12 14\" aria-hidden=\"true\"><path d=\"M0 0h4v14H0zM8 0h4v14H8z\"/></svg>"
const UiSounds = {
	Move: 0.45,
	Tab: 0.4,
	Select: 0.6,
	Back: 0.55,
	Start: 0.75,
	Wipe: 0.3,
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

function FetchSamples() {
	const Names = Object.keys(UiSounds)
	return Promise.all(Names.map(function (Name) {
		return fetch(UiFolder + Name + ".mp3")
			.then(function (Response) { return Response.ok ? Response.arrayBuffer() : null })
			.catch(function () { return null })
	})).then(function (Buffers) {
		const ByName = {}
		Names.forEach(function (Name, Index) { ByName[Name] = Buffers[Index] })
		return ByName
	})
}

function DecodeSamples(AudioContextInstance, RawByName) {
	const Names = Object.keys(RawByName).filter(function (Name) { return RawByName[Name] })
	return Promise.all(Names.map(function (Name) {
		return AudioContextInstance.decodeAudioData(RawByName[Name]).catch(function () { return null })
	})).then(function (Decoded) {
		const ByName = {}
		Names.forEach(function (Name, Index) { ByName[Name] = Decoded[Index] })
		return ByName
	})
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
	Range.setAttribute("aria-label", "volume")

	Root.appendChild(Toggle)
	Root.appendChild(Info)
	Root.appendChild(Range)
	return { Toggle: Toggle, Fill: Fill, Range: Range }
}

export function CreateSounds(Track, Root) {
	const RawSamples = FetchSamples()
	let Volume = ReadVolume()
	let SoundOn = true
	let Ducked = false
	let Unlocked = false
	let AudioContextInstance = null
	let Samples = {}
	let SamplesReady = Promise.resolve()
	let Music = null

	function PlaySample(Name) {
		const SampleBuffer = Samples[Name]
		if (!SoundOn || !AudioContextInstance || !SampleBuffer) return

		const Source = AudioContextInstance.createBufferSource()
		const Gain = AudioContextInstance.createGain()
		Source.buffer = SampleBuffer
		Gain.gain.value = UiSounds[Name] * UiVolume * Volume
		Source.connect(Gain)
		Gain.connect(AudioContextInstance.destination)
		Source.start()
	}

	function PlayMusic() {
		if (Music) Music.play().catch(function () { return })
	}

	if (Track.File) {
		Music = new Audio(Track.File)
		Music.loop = true
		Music.preload = "none"
		Music.volume = Volume
		const Widget = BuildWidget(Root, Track, Volume)

		function ShowPaused() {
			Widget.Toggle.innerHTML = PlayIcon
			Widget.Toggle.setAttribute("aria-label", "play music")
			Root.classList.remove("Playing")
		}

		Widget.Toggle.addEventListener("click", function () {
			Ducked = false
			SoundOn = Music.paused
			if (SoundOn) PlayMusic()
			else Music.pause()
		})
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
	} else {
		Root.hidden = true
	}

	return {
		Unlock: function () {
			if (Unlocked) return
			Unlocked = true
			const AudioContextClass = window.AudioContext || window.webkitAudioContext
			if (AudioContextClass) {
				AudioContextInstance = new AudioContextClass()
				SamplesReady = RawSamples
					.then(function (RawByName) { return DecodeSamples(AudioContextInstance, RawByName) })
					.then(function (Decoded) { Samples = Decoded })
			}
			PlayMusic()
		},
		Move: function () { PlaySample("Move") },
		Tab: function () { PlaySample("Tab") },
		Select: function () { PlaySample("Select") },
		Back: function () { PlaySample("Back") },
		Wipe: function () { PlaySample("Wipe") },
		Start: function () {
			SamplesReady.then(function () { PlaySample("Start") })
		},
		Duck: function () {
			if (!Music || Music.paused) return
			Ducked = true
			Music.pause()
		},
		Unduck: function () {
			if (!Ducked) return
			Ducked = false
			PlayMusic()
		},
	}
}
