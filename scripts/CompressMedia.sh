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
UiRate=128k
UiPeakDb=-3
UiFadeIn=0.006
UiFadeOut=0.03

ArtMaxWidth=1600
ArtThumbWidth=600
ArtPieces=(Art01 Art02 Art03)

UiSounds=(
	"Move|0|0.083"
	"Tab|0|0.081"
	"Select|0|0.7"
	"Back|0.1|0.12"
	"Start|0|0.9"
	"Wipe|0|0.638"
)

Clips=(
	"Local/OathboundScytheSkill.mp4|OathboundScytheSkill|Other"
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

Games=(TypeSoul BladesOfChance BratDuels Veyth Vania SteelVelocity Seraphs MultiMayhem Calamity AnimeVerse)

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

mkdir -p "$SiteRoot/media/Art"

for Name in "${ArtPieces[@]}"; do
	Input="$SourceRoot/Art/$Name.png"
	ffmpeg -y -v error -i "$Input" -vf "scale='min($ArtMaxWidth,iw)':-2" -q:v 2 "$SiteRoot/media/Art/$Name.jpg"
	ffmpeg -y -v error -i "$Input" -vf "scale='min($ArtThumbWidth,iw)':-2" -q:v "$ImageQuality" "$SiteRoot/media/Art/$Name-Thumb.jpg"
done

mkdir -p "$AudioOut/Ui"

for Entry in "${UiSounds[@]}"; do
	IFS="|" read -r Name TrimStart Length <<< "$Entry"
	Input="$SourceRoot/UiSounds/$Name.wav"
	FadeOutStart=$(awk "BEGIN { print $Length - $UiFadeOut }")
	Filters="atrim=$TrimStart:$(awk "BEGIN { print $TrimStart + $Length }"),asetpts=PTS-STARTPTS"
	if [ "$TrimStart" != "0" ]; then
		Filters="$Filters,afade=t=in:d=$UiFadeIn"
	fi
	Filters="$Filters,afade=t=out:st=$FadeOutStart:d=$UiFadeOut,aformat=channel_layouts=mono"
	Staged="$(mktemp --suffix=.wav)"
	ffmpeg -y -v error -i "$Input" -vn -af "$Filters" -ar 44100 -c:a pcm_f32le "$Staged"
	PeakDb=$(ffmpeg -v info -i "$Staged" -af "astats=measure_perchannel=none:measure_overall=Peak_level" -f null - 2>&1 \
		| sed -n 's/.*Peak level dB: \(-\{0,1\}[0-9.]*\).*/\1/p')
	Gain=$(awk "BEGIN { print $UiPeakDb - $PeakDb }")
	ffmpeg -y -v error -i "$Staged" -af "volume=${Gain}dB" -map_metadata -1 -c:a libmp3lame -b:a "$UiRate" \
		"$AudioOut/Ui/$Name.mp3"
	rm -f "$Staged"
done
