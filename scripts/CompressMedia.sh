#!/usr/bin/env bash
set -euo pipefail

SourceRoot="$1"
SiteRoot="$(cd "$(dirname "$0")/.." && pwd)"
WorksOut="$SiteRoot/media/Works"
GamesOut="$SiteRoot/media/Games"
AudioOut="$SiteRoot/media/Audio"

ClipMaxWidth=1280
ClipQuality=26
PosterWidth=640
PosterPoint=0.3
SfxAudioRate=160k
OtherAudioRate=128k
ImageQuality=3
TrackRate=128k

Clips=(
	"Local/AizenModePopSfx.mp4|AizenModePopSfx|Sfx"
	"Local/HachiCleaveSfx.mp4|HachiCleaveSfx|Sfx"
	"Local/StylisedFlashstepSfx.mp4|StylisedFlashstepSfx|Sfx"
	"Local/JinwooAwakeningSfx.mp4|JinwooAwakeningSfx|Sfx"
	"Local/KehrenSfx.mp4|KehrenSfx|Sfx"
	"Local/InfernoBeatdownSfx.mp4|InfernoBeatdownSfx|Sfx"
	"Roport/GojoCutsceneSfx.mp4|GojoCutsceneSfx|Sfx"
	"Roport/WukongCutsceneSfx.mp4|WukongCutsceneSfx|Sfx"
	"Roport/FireSamuraiCutsceneSfx.mp4|FireSamuraiCutsceneSfx|Sfx"
	"Roport/MysticLightSfx.mp4|MysticLightSfx|Sfx"
	"Roport/KidoSfx.mp4|KidoSfx|Sfx"
	"Roport/AccessoryVfx.mp4|AccessoryVfx|Other"
	"Roport/CutsceneVfx.mp4|CutsceneVfx|Other"
	"Roport/ChainedTogether.mp4|ChainedTogether|Other"
	"Roport/DualDestruction.mp4|DualDestruction|Other"
	"Roport/EnergyPunchCombo.mp4|EnergyPunchCombo|Sfx"
)

Games=(TypeSoul BladesOfChance BratDuels Veyth Vania SteelVelocity Seraphs MultiMayhem)

mkdir -p "$WorksOut" "$GamesOut" "$AudioOut"

for Entry in "${Clips[@]}"; do
	IFS="|" read -r Source Name Kind <<< "$Entry"
	Input="$SourceRoot/$Source"
	AudioRate=$([ "$Kind" = "Sfx" ] && echo "$SfxAudioRate" || echo "$OtherAudioRate")
	ffmpeg -y -v error -i "$Input" -c:v libx264 -crf "$ClipQuality" -preset slow -pix_fmt yuv420p \
		-vf "scale='min($ClipMaxWidth,iw)':-2" -c:a aac -b:a "$AudioRate" -movflags +faststart "$WorksOut/$Name.mp4"
	Duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$Input")
	PosterTime=$(awk "BEGIN { print $Duration * $PosterPoint }")
	ffmpeg -y -v error -ss "$PosterTime" -i "$Input" -frames:v 1 -vf "scale=$PosterWidth:-2" -q:v "$ImageQuality" \
		"$WorksOut/$Name.jpg"
done

ffmpeg -y -v error -i "$SourceRoot/Roport/Ui.png" -vf "scale='min($ClipMaxWidth,iw)':-2" -q:v "$ImageQuality" \
	"$WorksOut/Ui.jpg"

for Name in "${Games[@]}"; do
	Input=$(ls "$SourceRoot/Games/$Name".* | head -n 1)
	ffmpeg -y -v error -i "$Input" -frames:v 1 \
		-vf "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720" -q:v "$ImageQuality" "$GamesOut/$Name.jpg"
done

ffmpeg -y -v error -i "$SourceRoot/Local/BetterDays.mp3" -map 0:a -c:a libmp3lame -b:a "$TrackRate" \
	"$AudioOut/BetterDays.mp3"
