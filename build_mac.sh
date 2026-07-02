#!/bin/bash

set -e
trap 'tput cnorm; echo -e "\n🛑 Build interrupted."; exit 1' INT TERM

echo "🚀 Starting Tibialy isolated build process for macOS..."

ORIGINAL_DIR=$(pwd)
WORK_DIR=$(mktemp -d)
echo "📦 Creating isolated workspace at $WORK_DIR..."
cd "$WORK_DIR"

run_with_spinner() {
    local prefix="$1"
    shift

    "$@" > build.log 2>&1 &
    local pid=$!
    local delay=0.1
    local frames=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")

    tput civis
    while kill -0 $pid 2>/dev/null; do
        for frame in "${frames[@]}"; do
            local latest_msg=""
            if [ -f build.log ]; then
                latest_msg=$(tail -n 1 build.log | tr -d '\r\n' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
            fi
            local term_width=${COLUMNS:-$(tput cols 2>/dev/null || echo 80)}
            local max_len=$(( term_width - ${#prefix} - 8 ))
            if [ ${#latest_msg} -gt $max_len ] && [ $max_len -gt 0 ]; then
                latest_msg="${latest_msg:0:$((max_len - 3))}..."
            fi
            printf "\r%s %s: \033[2m%s\033[0m\033[K" "$frame" "$prefix" "$latest_msg"
            sleep $delay
            kill -0 $pid 2>/dev/null || break
        done
    done
    tput cnorm
    wait $pid
    local status=$?

    if [ $status -ne 0 ]; then
        printf "\r❌ %s... Failed!\033[K\n" "$prefix"
        echo "================ ERROR LOG ================"
        cat build.log
        echo "==========================================="
        exit $status
    else
        printf "\r✅ %s... Done!\033[K\n" "$prefix"
    fi
}

echo "🛠️ Fetching ephemeral uv package manager..."
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    UV_URL="https://github.com/astral-sh/uv/releases/latest/download/uv-aarch64-apple-darwin.tar.gz"
else
    UV_URL="https://github.com/astral-sh/uv/releases/latest/download/uv-x86_64-apple-darwin.tar.gz"
fi
curl -LsSf "$UV_URL" | tar -xz --strip-components=1

echo "🔍 Resolving latest release tag..."
LATEST_TAG_URL=$(curl -Ls -o /dev/null -w %{url_effective} https://github.com/NiltonDuarte/tibialy/releases/latest)
LATEST_TAG=${LATEST_TAG_URL##*/}

if [ -z "$LATEST_TAG" ] || [ "$LATEST_TAG" = "latest" ]; then
    echo "❌ Failed to resolve the latest release tag."
    rm -rf "$WORK_DIR"
    exit 1
fi

echo "📥 Downloading Tibialy source code ($LATEST_TAG)..."
curl -LsSf "https://github.com/NiltonDuarte/tibialy/archive/refs/tags/${LATEST_TAG}.zip" -o repo.zip
unzip -q repo.zip
cd tibialy-*

export UV_PYTHON_PREFERENCE="only-managed"
run_with_spinner "Installing isolated Python" ../uv python install 3.12

export SETUPTOOLS_SCM_PRETEND_VERSION="${LATEST_TAG#v}"
run_with_spinner "Resolving project deps" ../uv sync
run_with_spinner "Compiling App Bundle" ../uv run python build.py

# Extract to the final home first
echo "📦 Extracting Tibialy.app to final home..."
if [ -d "dist/Tibialy.app" ]; then
    rm -rf "$ORIGINAL_DIR/Tibialy.app"
    mv dist/Tibialy.app "$ORIGINAL_DIR/Tibialy.app"
else
    echo "❌ Build failed. Tibialy.app not found."
    rm -rf "$WORK_DIR"
    exit 1
fi

# Cleanup temporary environment
echo "🧹 Wiping temporary build files..."
cd "$ORIGINAL_DIR"
rm -rf "$WORK_DIR"

# Locally sign the binary at its home path to pass AMFI and Apple System Policy
echo "🔒 Localizing app signatures..."
find ./Tibialy.app -exec xattr -c {} + 2>/dev/null || true
codesign --force --sign - ./Tibialy.app/Contents/MacOS/Tibialy

echo ""
echo "🎉 Build Complete!"
echo "========================================================"
echo "✅ Tibialy.app has been saved to: $ORIGINAL_DIR"
echo "💡 You can now move it to your /Applications folder or run it directly via:"
echo "   open Tibialy.app"
echo "========================================================"
