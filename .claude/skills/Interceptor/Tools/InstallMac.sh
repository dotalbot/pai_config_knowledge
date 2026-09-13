#!/usr/bin/env bash
# Interceptor install — run ON THE MAC (dominics-macbook-pro), not on jellybase.
#
# Installs the CLI + native messaging host. Loading the Chrome extension is a
# manual GUI step at the end; Chrome has no scriptable path for unpacked
# extensions, so the script stops and tells you what to click.
#
# Written 2026-09-12 from skills/Interceptor/Workflows/Update.md.
# Safe to re-run. Nothing here touches the jellybase server.

set -euo pipefail

REPO="https://github.com/Hacker-Valley-Media/slop-browser"
SRC="$HOME/Projects/interceptor"

say() { printf '\n\033[1m== %s\033[0m\n' "$1"; }
die() { printf '\n\033[31mFAILED: %s\033[0m\n' "$1" >&2; exit 1; }

# --- 0. Preflight -----------------------------------------------------------
say "Preflight"
[ "$(uname -s)" = "Darwin" ] || die "This runs on the Mac. You're on $(uname -s)."
command -v git >/dev/null || die "git missing — run: xcode-select --install"
command -v bun >/dev/null || die "bun missing — run: curl -fsSL https://bun.sh/install | bash"

# Homebrew bin dir differs by arch: Apple Silicon /opt/homebrew, Intel /usr/local
if [ -d /opt/homebrew/bin ]; then BINDIR=/opt/homebrew/bin
elif [ -d /usr/local/bin ]; then BINDIR=/usr/local/bin
else die "No /opt/homebrew/bin or /usr/local/bin found"; fi
echo "arch=$(uname -m)  bindir=$BINDIR  bun=$(bun --version)"

[ -d "/Applications/Google Chrome.app" ] \
  || echo "WARNING: Google Chrome.app not found — install Chrome before the extension step."

# --- 1. Source --------------------------------------------------------------
say "Fetching source"
if [ -d "$SRC/.git" ]; then
  # Upstream force-pushes on release, so pull is unreliable. Reset, but only
  # after showing any local changes so patches aren't silently destroyed.
  cd "$SRC"
  if [ -n "$(git status --porcelain)" ]; then
    echo "Local modifications present:"; git status --short
    read -r -p "Discard them and reset to origin/main? [y/N] " a
    [ "$a" = "y" ] || die "Stopped. Preserve your patches, then re-run."
  fi
  git fetch origin && git reset --hard origin/main
else
  mkdir -p "$HOME/Projects"
  git clone "$REPO" "$SRC"
  cd "$SRC"
fi
echo "at commit: $(git rev-parse --short HEAD)"

# --- 2. Build ---------------------------------------------------------------
say "Installing deps + building"
bun install                 # must precede build; upstream adds deps between releases
bash scripts/build.sh

[ -f dist/interceptor ]           || die "build produced no dist/interceptor"
[ -f daemon/interceptor-daemon ]  || die "build produced no daemon/interceptor-daemon"
[ -d extension/dist ]             || die "build produced no extension/dist"

# --- 3. Install binaries ----------------------------------------------------
say "Installing binaries to $BINDIR"
# /usr/local/bin needs sudo on a stock Mac; /opt/homebrew/bin normally doesn't.
if [ -w "$BINDIR" ]; then CP="cp"; else CP="sudo cp"; echo "(sudo needed for $BINDIR)"; fi
$CP dist/interceptor "$BINDIR/"
$CP daemon/interceptor-daemon "$BINDIR/"

# --- 4. Register native messaging host --------------------------------------
say "Registering native messaging host"
# --skip-extension is correct for branded Chrome: it ignores --load-extension,
# so the extension is loaded by hand in step 6.
bash scripts/install.sh --chrome --skip-extension

# --- 5. CLI check -----------------------------------------------------------
say "CLI check"
command -v interceptor >/dev/null || die "interceptor not on PATH — add $BINDIR to PATH"
interceptor status || true   # non-zero until the extension is loaded; expected here

# --- 6. Manual step ---------------------------------------------------------
cat <<EOF

================================================================
  CLI installed. One manual step left — Chrome cannot be scripted.
================================================================

  1. Open Chrome, go to:  chrome://extensions
  2. Turn ON "Developer mode" (top right)
  3. If an old Interceptor card exists, DELETE it
     (reload is not enough — a changed manifest key changes the extension ID)
  4. Click "Load unpacked" and select exactly:

       $SRC/extension/dist

  5. Back in this terminal, confirm:

       interceptor status
       interceptor open "https://example.com"

     'status' should show a daemon line. 'bridge: not running' is fine —
     the bridge is optional and unnecessary for web verification.

  Then point it at Pulse on the server:

       interceptor open "https://jellybase.cheetah-iwato.ts.net:31337"
       interceptor screenshot --save

     Note BOTH details — either one wrong and Chrome shows an error page:

       * HTTPS, not HTTP. PULSE.toml sets tls.enabled for all non-loopback
         listeners, so the tailnet socket speaks TLS and silently drops a
         plaintext request. Only loopback stays plain HTTP.
       * The FULL MagicDNS name. The cert CN is
         jellybase.cheetah-iwato.ts.net; bare "jellybase" or the raw tailnet
         IP (100.125.86.118) fails cert validation in Chrome.

     LAN does not work at all: Pulse binds only 127.0.0.1 and 100.125.86.118,
     never 192.168.1.2.

================================================================
EOF
