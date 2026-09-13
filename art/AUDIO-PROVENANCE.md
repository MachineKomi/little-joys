# Optional soundtrack provenance

The owner explicitly authorised selective reuse of their existing game audio for Little Joys on 13 September 2026. This implementation uses one owner-provided original soundtrack file, with optional music disabled by default and controlled separately from toy effects in Parent settings. No private playtest text is copied into this repository.

| Field | Value |
|---|---|
| Title | MsP Garden 2 Sleepy Afternoon with Friends |
| Source repository | MachineKomi/maze-so-puzzle |
| Source path | `public/assets/ost/garden/MsP Garden 2 Sleepy Afternoon with Friends.mp3` |
| Little Joys runtime path | `public/assets/music.mp3` |
| Original source bytes | 3,487,483 |
| Original source SHA-256 | `4809c2e434ec5e6c322bb2ee8b9bb28c39fdaa910485e6b886dc5cfeed09fa8e` |
| Runtime encoded bytes | 3,458,184 |
| Runtime SHA-256 | `599ed6e8ebc1002854c6fe4241f0d60d0d9a552e316a175f89dcf690e8090365` |
| Derivative | Leading 29,299-byte ID3v2.4 metadata block removed; encoded MPEG audio bytes preserved exactly |
| Recorded origin | Owner-delivered original game soundtrack |
| Reuse authority | Explicit owner direction in the Little Joys implementation session, 2026-09-13 |
| Generation model and per-track generation reference | Not established by the inspected source metadata; none invented |

Metadata measured by Chromium decoding during development: 146.1335 seconds, stereo, decoded at 48 kHz, peak sample magnitude 0.8547147, whole-track RMS 0.1605593. These measurements do not establish perceived loudness or listening suitability. No listening judgement or child response is claimed.

The runtime uses exactly one lazy HTMLAudioElement and never decodes the complete track into a Web Audio buffer. A full 48 kHz stereo float decode would occupy approximately 56,115,264 bytes, which is why that approach is avoided. Browser-managed streaming buffers are not measured total browser RAM. The static music file is included in the complete offline cache and reported transfer budget.

Music starts only after an explicit adult enable gesture and a return to play. It stops for Pause, Toybox, Parent settings, backgrounding, and child Mute. Default gain is 0.08, with an adult range of 0–0.20; device volume also controls loudness. Failed playback stays silent. Muting invalidates outstanding play requests.

Toy sound effects remain original bounded procedural synthesis in `src/core/audio.ts`. No source-game runtime audio engine or bulk sound archive was copied. The separate original-source repository was read only.

The streaming element routes through a GainNode in the same lazily created AudioContext used by toy effects. This preserves the explicit music-gain cap without relying on the media element's volume setter, which Apple's [Safari iOS audio guidance](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/Using_HTML5_Audio_Video/Device-SpecificConsiderations/Device-SpecificConsiderations.html) documents as unavailable on iOS. The source is archived documentation; actual current iPad behavior remains in the physical-device gate. Muting or pausing zeros the gain immediately and invalidates pending play promises. Enabling music does not enable toy effects.

## Runtime metadata inspection — 13 September 2026

Inspected the source copy's ID3v2.4 frames before publication. They included the track title, an artist/account label, encoder and container fields, an originating service link, generation comments, an embedded picture (APIC), and an opaque general attachment (GEOB). Account labels, source identifiers, timestamps, pictures, and attachments were removed together; their values are deliberately omitted from this public record. The metadata identifies Suno as the originating service, but it does not establish a generation model or independently establish rights.

The runtime derivative removes the complete leading metadata block without transcoding. Its remaining encoded audio stream is byte-for-byte identical to the source stream. The source repository was not changed. No ID3v1 or APEv2 footer was present. This inspection concerns standard MP3 metadata, not a claim about the sound's content or listening suitability.
