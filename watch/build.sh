#!/bin/sh
# Build the watch app for the Forerunner 970: watch/bin/WorkoutPath.prg
#   ./build.sh          build
#   ./build.sh sim      build, then run it in the Connect IQ simulator
#   ./build.sh test     build with the unit tests (source/Tests.mc) and run them in the simulator
# Needs the Connect IQ SDK (SDK Manager), Java, and the developer key at ~/.connectiq/developer_key.der.
set -e
cd "$(dirname "$0")"
CIQ="$HOME/Library/Application Support/Garmin/ConnectIQ"
SDK="$(cat "$CIQ/current-sdk.cfg")"
KEY="${CIQ_KEY:-$HOME/.connectiq/developer_key.der}"
[ -f source/Secrets.mc ] || cp source/Secrets.mc.example source/Secrets.mc
mkdir -p bin
if [ "$1" = "test" ]; then
  "$SDK/bin/monkeyc" -f monkey.jungle -d fr970 -y "$KEY" -o bin/WorkoutPathTest.prg -w -t
  pgrep -f ConnectIQ.app/Contents/MacOS/simulator >/dev/null || { open "$SDK/bin/ConnectIQ.app"; sleep 5; }
  exec "$SDK/bin/monkeydo" bin/WorkoutPathTest.prg fr970 -t
fi
"$SDK/bin/monkeyc" -f monkey.jungle -d fr970 -y "$KEY" -o bin/WorkoutPath.prg -w
echo "Built bin/WorkoutPath.prg"
if [ "$1" = "sim" ]; then
  open "$SDK/bin/ConnectIQ.app"
  sleep 3
  "$SDK/bin/monkeydo" bin/WorkoutPath.prg fr970
fi
